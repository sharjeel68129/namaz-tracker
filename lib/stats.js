// Counters, chart cells and statistics, all worked out from the saved rows. Nothing here is stored.
import { PRAYERS, addDays, logId } from "./days.js";

/** Qaza still owed per prayer plus `total`: starting balance + missed - Qaza prayed. */
export function owedCounts(startQaza, logs, qazaLogs) {
  const owed = { total: 0 };
  for (const { id } of PRAYERS) owed[id] = Number(startQaza?.[id]) || 0;
  for (const log of logs) if (log.status === "missed") owed[log.prayer] += 1;
  for (const entry of qazaLogs) owed[entry.prayer] -= entry.count;
  for (const { id } of PRAYERS) {
    owed[id] = Math.max(0, owed[id]);
    owed.total += owed[id];
  }
  return owed;
}

export const START_EDIT_LOGS = 2;

/**
 * The starting Qaza can be corrected until the user has made this many logs of their own
 * (prayers marked by hand plus Qaza entries). Prayers auto-counted as missed do not use it up.
 */
export function startEditable(logs, qazaLogs) {
  return logs.filter((log) => !log.auto).length + qazaLogs.length < START_EDIT_LOGS;
}

/** The lowest starting number allowed per prayer, so Qaza already logged never pushes a balance above 0. */
export function minStart(logs, qazaLogs) {
  const least = {};
  for (const { id } of PRAYERS) least[id] = 0;
  for (const entry of qazaLogs) least[entry.prayer] += entry.count;
  for (const log of logs) if (log.status === "missed") least[log.prayer] -= 1;
  for (const { id } of PRAYERS) least[id] = Math.max(0, least[id]);
  return least;
}

/**
 * One cell per day for a contribution chart. `level` is how many of the five were prayed (0-5),
 * or null for a day with nothing to show: before tracking began, in the future, or still open
 * with nothing logged yet.
 */
export function chartCells(days, startDay, today, logMap) {
  const yesterday = addDays(today, -1);
  return days.map((day) => {
    if (day < startDay || day > today) return { day, level: null };
    let prayed = 0;
    let logged = 0;
    for (const { id } of PRAYERS) {
      const log = logMap.get(logId(day, id));
      if (log) logged += 1;
      if (log?.status === "prayed") prayed += 1;
    }
    return { day, level: logged === 0 && day >= yesterday ? null : prayed };
  });
}

/** Statistics for the days `from` to `to` inclusive; a null bound means no limit on that side. */
export function rangeStats(from, to, logs, qazaLogs) {
  const inRange = (day) => (!from || day >= from) && (!to || day <= to);
  const perPrayer = {};
  for (const { id } of PRAYERS) perPrayer[id] = { prayed: 0, missed: 0, qaza: 0 };
  const prayedByDay = new Map();
  let prayed = 0;
  let missed = 0;
  let qazaPrayed = 0;

  for (const log of logs) {
    if (!inRange(log.day)) continue;
    if (log.status === "prayed") {
      prayed += 1;
      perPrayer[log.prayer].prayed += 1;
      prayedByDay.set(log.day, (prayedByDay.get(log.day) || 0) + 1);
    } else {
      missed += 1;
      perPrayer[log.prayer].missed += 1;
    }
  }
  for (const entry of qazaLogs) {
    if (!inRange(entry.date_prayed)) continue;
    qazaPrayed += entry.count;
    perPrayer[entry.prayer].qaza += entry.count;
  }

  let perfectDays = 0;
  for (const count of prayedByDay.values()) if (count === PRAYERS.length) perfectDays += 1;
  const due = prayed + missed;
  return { perfectDays, missed, qazaPrayed, onTime: due ? Math.round((prayed / due) * 100) : null, perPrayer };
}

/** "noginosh698@gmail.com" -> "********698@gmail.com": only the last 3 characters of the name show. */
export function maskEmail(email) {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  const shown = Math.min(3, name.length - 1);
  return "*".repeat(name.length - shown) + name.slice(name.length - shown) + email.slice(at);
}
