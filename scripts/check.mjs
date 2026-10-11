// Edge-case checks for the date and statistics rules: npm run check
import assert from "node:assert/strict";
import { PRAYERS, addDays, daysBetween, expiredUnlogged, indexLogs, visibleCards } from "../lib/days.js";
import { chartCells, maskEmail, minStart, owedCounts, rangeStats, startEditable } from "../lib/stats.js";

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const log = (day, prayer, status, loggedAt, auto = false) => ({ day, prayer, status, auto, logged_at: loggedAt.toISOString() });
const START = "2026-10-01";

// Day keys.
assert.equal(addDays("2026-10-31", 1), "2026-11-01");
assert.deepEqual(daysBetween("2026-10-30", "2026-11-01"), ["2026-10-30", "2026-10-31", "2026-11-01"]);
assert.deepEqual(daysBetween("2026-10-02", "2026-10-01"), []);

// 11:59PM vs 12AM: the day rolls over and yesterday's unlogged prayers drop below.
let cards = visibleCards(at(2026, 10, 10, 23, 59), START, indexLogs([]));
assert.equal(cards.today[0].day, "2026-10-10");
assert.equal(cards.past[0].day, "2026-10-09");
cards = visibleCards(at(2026, 10, 11, 0, 0), START, indexLogs([]));
assert.equal(cards.today[0].day, "2026-10-11");
assert.equal(cards.past.length, 5);
assert.equal(cards.past[0].day, "2026-10-10");

// No past rectangles on the first tracked day.
assert.equal(visibleCards(at(2026, 10, 1, 9), START, indexLogs([])).past.length, 0);

// A present-day log stays as "Logged" until 12AM, then is gone, even if logged at 11:50PM.
const late = [log("2026-10-10", "isha", "prayed", at(2026, 10, 10, 23, 50))];
assert.ok(visibleCards(at(2026, 10, 10, 23, 59), START, indexLogs(late)).today[4].log);
cards = visibleCards(at(2026, 10, 11, 0, 5), START, indexLogs(late));
assert.deepEqual(cards.past.map((c) => c.prayer.id), ["fajr", "zuhr", "asr", "maghrib"]);

// A past-day log stays 29 minutes, not 30.
const pastLog = [log("2026-10-10", "fajr", "missed", at(2026, 10, 11, 8, 0))];
assert.equal(visibleCards(at(2026, 10, 11, 8, 29), START, indexLogs(pastLog)).past.length, 5);
assert.equal(visibleCards(at(2026, 10, 11, 8, 30), START, indexLogs(pastLog)).past.length, 4);

// 47h vs 48h: a day is open until 12AM two days later, then its unlogged prayers are missed.
assert.equal(expiredUnlogged("2026-10-02", START, indexLogs([])).length, 0); // 47h59m into Oct 1's window
const expired = expiredUnlogged("2026-10-03", START, indexLogs([log(START, "asr", "prayed", at(2026, 10, 1, 16))]));
assert.equal(expired.length, 4);
assert.ok(expired.every((row) => row.day === START && row.status === "missed" && row.auto));

// Counter: starting balance + missed - Qaza prayed, never below zero.
const logs = [
  log("2026-10-01", "fajr", "missed", at(2026, 10, 1, 7)),
  log("2026-10-01", "zuhr", "prayed", at(2026, 10, 1, 13)),
  ...PRAYERS.map((p) => log("2026-10-02", p.id, "prayed", at(2026, 10, 2, 20))),
];
const qaza = [{ prayer: "fajr", date_prayed: "2026-10-02", count: 3 }, { prayer: "isha", date_prayed: "2026-09-20", count: 1 }];
const owed = owedCounts({ fajr: 2, zuhr: 0, asr: 0, maghrib: 0, isha: 1 }, logs, qaza);
assert.equal(owed.fajr, 0);
assert.equal(owed.zuhr, 0);
assert.equal(owed.isha, 0);
assert.equal(owed.total, 0);
assert.equal(owedCounts({ fajr: 10 }, logs, []).fajr, 11);

// Chart levels 0-5, and grey for days with nothing to show.
const chartLogs = [];
for (let n = 0; n <= 5; n++) {
  const day = addDays("2026-10-01", n);
  PRAYERS.forEach((p, i) => chartLogs.push(log(day, p.id, i < n ? "prayed" : "missed", at(2026, 10, 1 + n, 12))));
}
const days = daysBetween("2026-09-29", "2026-10-09");
const cells = chartCells(days, START, "2026-10-08", indexLogs(chartLogs));
assert.deepEqual(cells.map((c) => c.level), [null, null, 0, 1, 2, 3, 4, 5, null, null, null]);
// An open day with one log counts what is prayed so far.
const partial = chartCells(["2026-10-08"], START, "2026-10-08", indexLogs([log("2026-10-08", "fajr", "missed", at(2026, 10, 8, 7))]));
assert.equal(partial[0].level, 0);

// Statistics for a range and for all time.
let stats = rangeStats("2026-10-01", "2026-10-02", logs, qaza);
assert.deepEqual([stats.perfectDays, stats.missed, stats.qazaPrayed, stats.onTime], [1, 1, 3, 86]);
assert.deepEqual(stats.perPrayer.fajr, { prayed: 1, missed: 1, qaza: 3 });
stats = rangeStats(null, null, logs, qaza);
assert.equal(stats.qazaPrayed, 4);
assert.equal(rangeStats("2026-11-01", "2026-11-30", logs, qaza).onTime, null);

// Email mask.
assert.equal(maskEmail("noginosh698@gmail.com"), "********698@gmail.com");
assert.equal(maskEmail("ab@x.org"), "*b@x.org");

// Starting Qaza stays editable until two logs made by hand; auto-missed prayers do not count.
const hand = log(START, "fajr", "prayed", at(2026, 10, 1, 6));
const auto = log(START, "zuhr", "missed", at(2026, 10, 3), true);
const entry = { prayer: "asr", date_prayed: START, count: 4 };
assert.equal(startEditable([], []), true);
assert.equal(startEditable([hand, auto, auto], []), true);
assert.equal(startEditable([hand], [entry]), false);
assert.equal(startEditable([hand, hand], []), false);
// Four Asr Qaza already logged, so the Asr start cannot drop below 4; a miss lowers the floor.
assert.equal(minStart([auto], [entry]).asr, 4);
assert.equal(minStart([log(START, "asr", "missed", at(2026, 10, 1))], [entry]).asr, 3);
assert.equal(minStart([auto], [entry]).zuhr, 0);

console.log("All checks passed.");
