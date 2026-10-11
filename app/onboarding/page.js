"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAYERS, dayKey } from "@/lib/days";
import { createProfile, loadAccountData } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import TopBar from "../top-bar";

/** Asked once, straight after the first login: how many Qaza are already owed for each prayer. */
export default function Onboarding() {
  const account = useAccount();
  const router = useRouter();
  const userId = account.user?.id;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  // Anyone who has already answered goes straight to the tracker.
  useEffect(() => {
    if (!userId) return;
    loadAccountData()
      .then(({ profile }) => (profile ? router.replace("/app") : setReady(true)))
      .catch((problem) => setError(`Your account could not be loaded: ${problem.message}`));
  }, [userId, router]);

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const startQaza = {};
    for (const { id } of PRAYERS) startQaza[id] = Math.max(0, Math.floor(Number(form.get(id)) || 0));
    setBusy(true);
    setError("");
    try {
      await createProfile(dayKey(new Date()), startQaza);
      router.replace("/app");
    } catch (problem) {
      setError(`Not saved: ${problem.message}`);
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <>
        <TopBar />
        <main className="page">
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : (
            <p className="muted">Loading…</p>
          )}
        </main>
      </>
    );
  }

  return (
    <>
    <TopBar />
    <main className="page wide">
      <h1>How many Qaza do you owe today?</h1>
      <p className="muted">
        Enter the prayers you already need to make up, for each timing. Leave a box at 0 if you owe none. You are
        only asked this once, so take a moment to get it right.
      </p>
      <form className="panel" onSubmit={onSubmit} aria-busy={busy}>
        <div className="qaza-grid">
          {PRAYERS.map((prayer) => (
            <div className="field" key={prayer.id}>
              <label htmlFor={prayer.id}>{prayer.name}</label>
              <input id={prayer.id} name={prayer.id} type="number" inputMode="numeric" min="0" step="1" defaultValue="0" required />
            </div>
          ))}
        </div>
        <button className="button" type="submit" disabled={busy}>
          Save and start tracking
        </button>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
    </>
  );
}
