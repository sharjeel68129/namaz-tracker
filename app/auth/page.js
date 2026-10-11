"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import Footer from "../footer";
import TopBar from "../top-bar";

const TITLES = { login: "Log in", signup: "Create your account", forgot: "Reset your password" };
const ACTIONS = { login: "Log in", signup: "Sign up", forgot: "Email me a reset link" };

/** Sign up, log in, or ask for a password reset link. A new account must confirm its email first. */
export default function AuthPage() {
  const account = useAccount();
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sentTo, setSentTo] = useState(""); // the address a confirmation link was just sent to

  useEffect(() => {
    if (account.status === "in") router.replace("/app");
  }, [account.status, router]);

  // The email link lands on /auth/callback, which sends people here when it could not sign them in.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("confirmed")) {
      setNotice("If you just confirmed your email, log in below.");
    }
  }, []);

  function switchTo(next) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const email = form.get("email");
    const password = form.get("password");
    // Empty when running locally, where the page's own address is the right one.
    const callback = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const { error: problem } = await supabase().auth.signInWithPassword({ email, password });
        if (problem) {
          setError(
            /not confirmed/i.test(problem.message)
              ? "Your email is not confirmed yet. Open the link we emailed you, then log in."
              : problem.message
          );
        }
      } else if (mode === "signup") {
        const { data, error: problem } = await supabase().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback },
        });
        if (problem) setError(problem.message);
        // Supabase answers a sign-up for an existing address with a user that has no identities.
        else if (data.user?.identities?.length === 0) setError("That email already has an account. Log in instead.");
        else if (!data.session) setSentTo(email);
      } else {
        const { error: problem } = await supabase().auth.resetPasswordForEmail(email, {
          redirectTo: `${callback}?next=settings`,
        });
        if (problem) setError(problem.message);
        else setNotice(`If ${email} has an account, a reset link is on its way.`);
      }
    } catch {
      setError("Could not reach the account service. Check your connection, then try again.");
    } finally {
      setBusy(false);
    }
  }

  if (account.status === "unconfigured") {
    return (
      <>
      <TopBar />
      <main className="page">
        <h1>Accounts are not set up yet</h1>
        <p className="muted">
          Add your Supabase URL and anon key to .env.local, then restart the dev server. The README has the steps.
        </p>
      </main>
      </>
    );
  }

  if (sentTo) {
    return (
      <>
      <TopBar />
      <main className="page">
        <h1>Check your inbox</h1>
        <p>
          Thank you for signing up. We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish
          creating your account.
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          It can take a minute to arrive. If you do not see it, look in your spam folder.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <button
            type="button"
            className="button quiet"
            onClick={() => {
              setSentTo("");
              switchTo("login");
            }}
          >
            Back to log in
          </button>
        </p>
      </main>
      <Footer />
      </>
    );
  }

  return (
    <>
    <TopBar />
    <main className="page">
      <h1>{TITLES[mode]}</h1>
      <form className="panel" onSubmit={onSubmit} aria-busy={busy}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" autoComplete="email" required />
        </div>
        {mode !== "forgot" && (
          <div className="field">
            <label htmlFor="password">Password{mode === "signup" && " (at least 8 characters)"}</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </div>
        )}
        <button className="button" type="submit" disabled={busy}>
          {ACTIONS[mode]}
        </button>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <p className="notice" aria-live="polite">
          {notice}
        </p>
      </form>

      <p className="row" style={{ marginTop: "1.25rem" }}>
        {mode === "login" ? (
          <>
            <span className="muted">New here?</span>
            <button type="button" className="link" onClick={() => switchTo("signup")}>
              Create an account
            </button>
            <button type="button" className="link" onClick={() => switchTo("forgot")}>
              Forgot password
            </button>
          </>
        ) : (
          <>
            <span className="muted">Already have an account?</span>
            <button type="button" className="link" onClick={() => switchTo("login")}>
              Log in
            </button>
          </>
        )}
      </p>
    </main>
    <Footer />
    </>
  );
}
