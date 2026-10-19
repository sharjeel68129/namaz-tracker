"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAYERS, dayKey } from "@/lib/days";
import { START_EDIT_LOGS, minStart, startEditable } from "@/lib/stats";
import { forgetDevice, pendingChanges, sendPending } from "@/lib/offline";
import { deleteAccount, loadAccountData, resetData, supabase, updateProfile } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import TopBar from "../top-bar";

/** A destructive button that asks for the password first, so an unlocked phone is not enough. */
function PasswordConfirm({ id, label, prompt, confirmLabel, busy, onConfirm }) {
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState("");
  if (!asking) {
    return (
      <button type="button" className="button danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setProblem("");
        // onConfirm returns what went wrong; nothing back means it is done.
        const failed = await onConfirm(new FormData(e.target).get("password"));
        if (failed) setProblem(failed);
        else setAsking(false);
      }}
    >
      <div className="field">
        <label htmlFor={id}>{prompt}</label>
        <input id={id} name="password" type="password" autoComplete="current-password" autoFocus required />
      </div>
      {problem && (
        <p className="alert" role="alert">
          {problem}
        </p>
      )}
      <div className="row">
        <button type="submit" className="button danger" disabled={busy}>
          {confirmLabel}
        </button>
        <button type="button" className="button quiet" disabled={busy} onClick={() => setAsking(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const account = useAccount();
  const router = useRouter();
  const userId = account.user?.id;
  const [reminders, setReminders] = useState(null); // null until the profile is loaded
  const [data, setData] = useState(null); // { profile, logs, qaza }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  useEffect(() => {
    if (!userId) return;
    loadAccountData()
      .then((loaded) => {
        if (!loaded.profile) return;
        setData(loaded);
        setReminders(loaded.profile.reminders);
      })
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

  function onSaveStart(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const startQaza = {};
    for (const { id } of PRAYERS) startQaza[id] = Math.max(0, Math.floor(Number(form.get(id)) || 0));
    run(async () => {
      await updateProfile(userId, { start_qaza: startQaza });
      setData((d) => ({ ...d, profile: { ...d.profile, start_qaza: startQaza } }));
    }, "Starting Qaza saved.");
  }

  const onLogOut = () =>
    run(async () => {
      // Changes made offline would be lost with this device's copy, so they go out first.
      await sendPending(userId);
      if (pendingChanges(userId).length) {
        throw new Error("Some changes made offline have not been sent yet. Connect to the internet, then log out.");
      }
      await supabase().auth.signOut();
      forgetDevice(userId);
      router.replace("/");
    });

  /** Saves every record as a spreadsheet file: starting Qaza, each prayer logged, each Qaza entry. */
  function onDownload() {
    const { profile, logs, qaza } = data;
    const rows = [["record", "date", "prayer", "status", "count", "logged_at"]];
    for (const { id } of PRAYERS) rows.push(["starting qaza", profile.start_day, id, "", profile.start_qaza?.[id] ?? 0, ""]);
    for (const log of logs) rows.push(["prayer", log.day, log.prayer, log.status + (log.auto ? " (counted at 48 hours)" : ""), "", log.logged_at]);
    for (const entry of qaza) rows.push(["qaza prayed", entry.date_prayed, entry.prayer, "", entry.count, entry.created_at]);
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `namaz-tracker-${dayKey(new Date())}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * Run a destructive action that needs the password (the database checks it). Returns what
   * went wrong, which is shown beside the password box; returns nothing when it went through.
   */
  async function withPassword(failure, action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (problem) {
      return `${problem.message} ${failure}`;
    } finally {
      setBusy(false);
    }
  }

  const onReset = (password) =>
    withPassword("Nothing was reset.", async () => {
      const zero = Object.fromEntries(PRAYERS.map((p) => [p.id, 0]));
      const today = dayKey(new Date());
      await resetData(password, today);
      forgetDevice(userId);
      setData((d) => d && { profile: { ...d.profile, start_day: today, start_qaza: zero }, logs: [], qaza: [] });
      setNotice("All data reset. Every counter is back to 0.");
    });

  const onDelete = (password) =>
    withPassword("Your account was not deleted.", async () => {
      await deleteAccount(password);
      forgetDevice(userId);
      router.replace("/");
    });

  if (account.status !== "in") {
    return (
      <>
        <TopBar />
        <main className="page">
          <p className="muted">Loading…</p>
        </main>
      </>
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

      {data && startEditable(data.logs, data.qaza) && (
        // Keyed by the saved numbers so the boxes refill after a save or a reset.
        <form className="panel" key={JSON.stringify(data.profile.start_qaza)} onSubmit={onSaveStart}>
          <h2>Starting Qaza</h2>
          <p className="muted">
            Correct the numbers you entered at sign-up. This closes for good once you have made {START_EDIT_LOGS}{" "}
            logs (prayers marked or Qaza entries).
          </p>
          <div className="qaza-grid">
            {PRAYERS.map((prayer) => (
              <div className="field" key={prayer.id}>
                <label htmlFor={`start-${prayer.id}`}>{prayer.name}</label>
                <input
                  id={`start-${prayer.id}`}
                  name={prayer.id}
                  type="number"
                  inputMode="numeric"
                  min={minStart(data.logs, data.qaza)[prayer.id]}
                  step="1"
                  defaultValue={Number(data.profile.start_qaza?.[prayer.id]) || 0}
                  required
                />
              </div>
            ))}
          </div>
          <div>
            <button className="button quiet" type="submit" disabled={busy}>
              Save starting Qaza
            </button>
          </div>
        </form>
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

      {data && (
        <section className="panel">
          <h2>Download my data</h2>
          <p className="muted">
            Every prayer you have logged, every Qaza entry and your starting numbers, as a spreadsheet file
            (CSV) that opens in Excel or Google Sheets.
          </p>
          <div>
            <button type="button" className="button quiet" onClick={onDownload}>
              Download my data
            </button>
          </div>
        </section>
      )}

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
        <PasswordConfirm
          id="reset-password"
          label="Reset all data"
          prompt="Enter your password to reset all data"
          confirmLabel="Yes, reset everything"
          busy={busy}
          onConfirm={onReset}
        />
      </section>

      <section className="panel danger-zone">
        <h2>Delete account</h2>
        <p className="muted">Deletes your account and everything in it. This cannot be undone.</p>
        <PasswordConfirm
          id="delete-password"
          label="Delete account"
          prompt="Enter your password to delete your account"
          confirmLabel="Yes, delete my account"
          busy={busy}
          onConfirm={onDelete}
        />
      </section>

      <p className="row muted" style={{ marginTop: "1.5rem" }}>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact: {CONTACT_EMAIL}</a>
      </p>
    </main>
    </>
  );
}
