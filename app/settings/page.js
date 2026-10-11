"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAYERS, dayKey } from "@/lib/days";
import { deleteAccount, loadAccountData, resetData, supabase, updateProfile } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import TopBar from "../top-bar";

/** A destructive button that asks once more before doing anything. */
function ConfirmButton({ label, confirmLabel, busy, onConfirm }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="button danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="row">
      <button type="button" className="button danger" disabled={busy} onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="button quiet" disabled={busy} onClick={() => setAsking(false)}>
        Cancel
      </button>
    </div>
  );
}

export default function Settings() {
  const account = useAccount();
  const router = useRouter();
  const userId = account.user?.id;
  const [reminders, setReminders] = useState(null); // null until the profile is loaded
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  useEffect(() => {
    if (!userId) return;
    loadAccountData()
      .then(({ profile }) => profile && setReminders(profile.reminders))
      .catch(() => {});
  }, [userId]);

  /** Run one settings action, reporting the outcome in the page's status lines. */
  async function run(action, done) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (done) setNotice(done);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  async function onToggleReminders(e) {
    const on = e.target.checked;
    setReminders(on);
    await run(() => updateProfile(userId, { reminders: on }), on ? "Reminder emails are on." : "Reminder emails are off.");
  }

  function onChangePassword(e) {
    e.preventDefault();
    const form = e.target;
    const password = new FormData(form).get("password");
    run(async () => {
      const { error: problem } = await supabase().auth.updateUser({ password });
      if (problem) throw new Error(problem.message);
      form.reset();
    }, "Password changed.");
  }

  const onLogOut = () =>
    run(async () => {
      await supabase().auth.signOut();
      router.replace("/");
    });

  const onReset = () =>
    run(async () => {
      const zero = Object.fromEntries(PRAYERS.map((p) => [p.id, 0]));
      await resetData(userId, dayKey(new Date()), zero);
    }, "All data reset. Every counter is back to 0.");

  const onDelete = () =>
    run(async () => {
      await deleteAccount();
      router.replace("/");
    });

  if (account.status !== "in") {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <>
    <TopBar email={account.user.email} />
    <main className="page wide">
      <h1>Settings</h1>

      {error && (
        <p className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}
      <p className="notice" aria-live="polite" style={{ marginTop: "1rem" }}>
        {notice}
      </p>

      {reminders !== null && (
        <section className="panel">
          <h2>Reminder email</h2>
          <label className="toggle">
            <input type="checkbox" checked={reminders} disabled={busy} onChange={onToggleReminders} />
            Email me at 6PM if any of yesterday&apos;s prayers are still not logged
          </label>
        </section>
      )}

      <form className="panel" onSubmit={onChangePassword}>
        <h2>Change password</h2>
        <div className="field">
          <label htmlFor="new-password">New password (at least 8 characters)</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <button className="button quiet" type="submit" disabled={busy}>
            Change password
          </button>
        </div>
      </form>

      <section className="panel">
        <h2>Log out</h2>
        <div>
          <button type="button" className="button quiet" disabled={busy} onClick={onLogOut}>
            Log out
          </button>
        </div>
      </section>

      <section className="panel danger-zone">
        <h2>Reset all data</h2>
        <p className="muted">Deletes every logged prayer and Qaza entry and sets all counters to 0. Your account stays.</p>
        <ConfirmButton label="Reset all data" confirmLabel="Yes, reset everything" busy={busy} onConfirm={onReset} />
      </section>

      <section className="panel danger-zone">
        <h2>Delete account</h2>
        <p className="muted">Deletes your account and everything in it. This cannot be undone.</p>
        <ConfirmButton label="Delete account" confirmLabel="Yes, delete my account" busy={busy} onConfirm={onDelete} />
      </section>
    </main>
    </>
  );
}
