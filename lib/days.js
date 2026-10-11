// Date rules for the tracker. A day is a local calendar day (12AM to 12AM on the device),
// written as "YYYY-MM-DD". Each day's prayers can be logged for 48 hours from its 12AM,
// so only today and yesterday are ever open.

export const PRAYERS = [
  { id: "fajr", name: "Fajr" },
  { id: "zuhr", name: "Zuhr" },
  { id: "asr", name: "Asr" },
  { id: "maghrib", name: "Maghrib" },
  { id: "isha", name: "Isha" },
];

/** How long a past-day rectangle stays on screen (as "Logged") after it is logged. */
export const PAST_LOGGED_MINUTES = 30;

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local midnight at the start of that day. */
export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const date = keyToDate(key);
  date.setDate(date.getDate() + n);
  return dayKey(date);
}

/** Every day from `from` to `to` inclusive ([] if `from` is after `to`). */
export function daysBetween(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

export const logId = (day, prayer) => `${day}|${prayer}`;

/** Logs keyed by day and prayer, for quick lookups. */
export function indexLogs(logs) {
  return new Map(logs.map((log) => [logId(log.day, log.prayer), log]));
}

/**
 * The rectangles to show right now: `today` always has all five (logged ones stay until 12AM);
 * `past` has yesterday's prayers that are still unlogged, or were logged as a past-day prayer
 * within the last 30 minutes.
 */
export function visibleCards(now, startDay, logMap) {
  const today = dayKey(now);
  const yesterday = addDays(today, -1);
  const midnight = keyToDate(today).getTime();
  const card = (day) => (prayer) => ({ day, prayer, log: logMap.get(logId(day, prayer.id)) || null });

  const past = yesterday < startDay ? [] : PRAYERS.map(card(yesterday)).filter(({ log }) => {
    if (!log) return true;
    const loggedAt = new Date(log.logged_at).getTime();
    // Logged before 12AM means it was logged as a present-day prayer, which goes at 12AM.
    return loggedAt >= midnight && now.getTime() - loggedAt < PAST_LOGGED_MINUTES * 60000;
  });
  return { today: PRAYERS.map(card(today)), past };
}

/** Prayers whose 48 hours ran out without a log, as rows ready to save as missed. */
export function expiredUnlogged(today, startDay, logMap) {
  const rows = [];
  for (const day of daysBetween(startDay, addDays(today, -2))) {
    for (const prayer of PRAYERS) {
      if (!logMap.has(logId(day, prayer.id))) rows.push({ day, prayer: prayer.id, status: "missed", auto: true });
    }
  }
  return rows;
}
