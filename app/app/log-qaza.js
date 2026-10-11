"use client";
import { useState } from "react";
import { PRAYERS } from "@/lib/days";

/** Record Qaza prayers made up. `onSave(prayer, date, count)` does the saving and may throw. */
export default function LogQaza({ owed, today, onSave }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const prayer = PRAYERS.find((p) => p.id === data.get("prayer"));
    const date = data.get("date");
    const count = Number(data.get("count"));
    setError("");
    setNotice("");

    // The counter never goes above zero, so nobody can log more than they owe.
    if (!Number.isInteger(count) || count < 1) return setError("Enter a whole number of 1 or more.");
    if (!date || date > today) return setError("Choose today or an earlier date.");
    if (owed[prayer.id] === 0) return setError(`You owe no ${prayer.name} Qaza, so there is nothing to log.`);
    if (count > owed[prayer.id]) return setError(`You owe ${owed[prayer.id]} ${prayer.name} Qaza. Enter ${owed[prayer.id]} or fewer.`);

    setBusy(true);
    try {
      await onSave(prayer.id, date, count);
      setNotice(`Logged ${count} ${prayer.name} Qaza.`);
      form.elements.count.value = "";
    } catch (problem) {
      setError(`Not saved: ${problem.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} aria-busy={busy}>
      <div className="field">
        <label htmlFor="qaza-prayer">Prayer timing</label>
        <select id="qaza-prayer" name="prayer" defaultValue="fajr">
          {PRAYERS.map((prayer) => (
            <option key={prayer.id} value={prayer.id}>
              {prayer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="qaza-date">Date prayed</label>
        <input id="qaza-date" name="date" type="date" defaultValue={today} max={today} required />
      </div>
      <div className="field">
        <label htmlFor="qaza-count">Number of Qaza</label>
        <input id="qaza-count" name="count" type="number" inputMode="numeric" min="1" step="1" placeholder="1" required />
      </div>
      <button className="button" type="submit" disabled={busy}>
        Log Qaza
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
  );
}
