"use client";
import { useState } from "react";
import { dayKey, daysBetween, keyToDate } from "@/lib/days";
import { chartCells, rangeStats } from "@/lib/stats";
import Chart from "./chart";
import StatsPanel from "./stats-panel";

const monthStart = (key) => `${key.slice(0, 7)}-01`;

function shiftMonth(key, n) {
  const date = keyToDate(key);
  return dayKey(new Date(date.getFullYear(), date.getMonth() + n, 1));
}

/** One calendar month at a time, back to the sign-up month, then statistics since sign-up. */
export default function History({ startDay, today, logs, qaza, logMap }) {
  const first = monthStart(startDay);
  const current = monthStart(today);
  const [month, setMonth] = useState(current);

  const date = keyToDate(month);
  const monthEnd = dayKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  const title = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="history-grid">
      <section className="panel">
        <div className="month-nav">
          <button type="button" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </button>
          <h2 aria-live="polite">{title}</h2>
          <button type="button" aria-label="Next month" disabled={month >= current} onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </button>
        </div>
        <div className="month-chart">
          <Chart calendar legend cells={chartCells(daysBetween(month, monthEnd), startDay, today, logMap)} />
        </div>
        <StatsPanel stats={rangeStats(month, monthEnd, logs, qaza)} />
      </section>

      <section className="panel">
        <h2>Since sign-up</h2>
        <StatsPanel stats={rangeStats(null, null, logs, qaza)} />
      </section>
    </div>
  );
}
