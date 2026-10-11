"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAYERS, addDays, dayKey, daysBetween, expiredUnlogged, indexLogs, visibleCards } from "@/lib/days";
import { chartCells, owedCounts, rangeStats } from "@/lib/stats";
import { addAutoMissed, deviceTimezone, loadAccountData, logPrayer, logQaza, undoPrayer, updateProfile } from "@/lib/supabase";
import { useAccount } from "@/lib/use-account";
import TopBar from "../top-bar";
import Chart from "./chart";
import LogQaza from "./log-qaza";
import PrayerCard from "./prayer-card";
import StatsPanel from "./stats-panel";

export default function Tracker() {
  const account = useAccount();
  const router = useRouter();
  const userId = account.user?.id;
  const [data, setData] = useState(null); // { profile, logs, qaza }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(""); // which rectangle is saving
  const [now, setNow] = useState(() => new Date());
  const [drawer, setDrawer] = useState(null); // "left" | "right" | null
  const [showStats, setShowStats] = useState(false);

  // Re-check the clock so rectangles disappear and the day rolls over without a refresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadAccountData()
      .then((loaded) => {
        if (!live) return;
        if (!loaded.profile) return router.replace("/onboarding");
        setData(loaded);
        // Keep the reminder email on the user's current clock if they have moved time zone.
        if (loaded.profile.timezone !== deviceTimezone()) {
          updateProfile(userId, { timezone: deviceTimezone() }).catch(() => {});
        }
      })
      .catch((problem) => live && setError(`Your prayers could not be loaded: ${problem.message}`));
    return () => {
      live = false;
    };
  }, [userId, router]);

  const today = dayKey(now);
  const startDay = data?.profile.start_day;
  const logsRef = useRef([]);
  logsRef.current = data?.logs || [];

  // Prayers whose 48 hours ran out are saved as missed, on load and again whenever the day changes.
  useEffect(() => {
    if (!startDay) return;
    const rows = expiredUnlogged(today, startDay, indexLogs(logsRef.current));
    if (!rows.length) return;
    let live = true;
    addAutoMissed(rows)
      .then(() => {
        if (!live) return;
        const loggedAt = new Date().toISOString();
        setData((d) => {
          const have = indexLogs(d.logs);
          const fresh = rows.filter((row) => !have.has(`${row.day}|${row.prayer}`));
          return { ...d, logs: [...d.logs, ...fresh.map((row) => ({ ...row, logged_at: loggedAt }))] };
        });
      })
      .catch((problem) => live && setError(`Expired prayers could not be saved as missed: ${problem.message}`));
    return () => {
      live = false;
    };
  }, [today, startDay]);

  const logMap = useMemo(() => indexLogs(data?.logs || []), [data?.logs]);

  if (error && !data) {
    return (
      <main className="page">
        <p className="alert" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <p className="muted" aria-live="polite">
          Loading your prayers…
        </p>
      </main>
    );
  }

  const { profile, logs, qaza } = data;
  const owed = owedCounts(profile.start_qaza, logs, qaza);
  const cards = visibleCards(now, profile.start_day, logMap);
  const last30 = addDays(today, -29);

  async function onLog(day, prayer, status) {
    setBusy(`${day}|${prayer}`);
    setError("");
    try {
      const row = await logPrayer(day, prayer, status);
      setData((d) => ({ ...d, logs: [...d.logs, row] }));
    } catch (problem) {
      setError(`Not logged: ${problem.message}`);
    } finally {
      setBusy("");
    }
  }

  async function onUndo(day, prayer) {
    setBusy(`${day}|${prayer}`);
    setError("");
    try {
      await undoPrayer(day, prayer);
      setData((d) => ({ ...d, logs: d.logs.filter((log) => !(log.day === day && log.prayer === prayer)) }));
    } catch (problem) {
      setError(`Not undone: ${problem.message}`);
    } finally {
      setBusy("");
    }
  }

  async function onSaveQaza(prayer, date, count) {
    const row = await logQaza(prayer, date, count);
    setData((d) => ({ ...d, qaza: [...d.qaza, row] }));
  }

  const renderCard = (past) => ({ day, prayer, log }) => (
    <PrayerCard
      key={`${day}|${prayer.id}`}
      prayer={prayer}
      past={past}
      log={log}
      owed={owed[prayer.id]}
      busy={busy === `${day}|${prayer.id}`}
      onLog={(status) => onLog(day, prayer.id, status)}
      onUndo={() => onUndo(day, prayer.id)}
    />
  );

  return (
    <>
      <TopBar email={account.user.email}>
        <div className="drawer-buttons">
          <button type="button" className="button quiet" onClick={() => setDrawer("left")}>
            Qaza balance
          </button>
          <button type="button" className="button quiet" onClick={() => setDrawer("right")}>
            Log Qaza
          </button>
        </div>
      </TopBar>

      <div className="columns">
        <aside className={`side side-left ${drawer === "left" ? "open" : ""}`}>
          <button type="button" className="button quiet side-close" onClick={() => setDrawer(null)}>
            Close
          </button>
          <section>
            <h2>Qaza balance</h2>
            <ul className="balance">
              {PRAYERS.map((prayer) => (
                <li key={prayer.id}>
                  <span>{prayer.name}</span>
                  <span>{owed[prayer.id] ? `-${owed[prayer.id]}` : "0"}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <main className="centre">
          <h2>Today</h2>
          {error && (
            <p className="alert" role="alert" style={{ marginBottom: "0.75rem" }}>
              {error}
            </p>
          )}
          <ul className="prayers">{cards.today.map(renderCard(false))}</ul>

          {cards.past.length > 0 && (
            <>
              <h2>Still to log from yesterday</h2>
              <ul className="prayers">{cards.past.map(renderCard(true))}</ul>
            </>
          )}

          <h2>Last 30 days</h2>
          <Chart legend cells={chartCells(daysBetween(last30, today), profile.start_day, today, logMap)} />
          <button
            type="button"
            className="button quiet stats-toggle"
            aria-expanded={showStats}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? "Hide statistics" : "Show statistics"}
          </button>
          {showStats && <StatsPanel stats={rangeStats(last30, today, logs, qaza)} />}
        </main>

        <aside className={`side side-right ${drawer === "right" ? "open" : ""}`}>
          <button type="button" className="button quiet side-close" onClick={() => setDrawer(null)}>
            Close
          </button>
          <section>
            <h2>Log Qaza</h2>
            <LogQaza owed={owed} today={today} onSave={onSaveQaza} />
          </section>
        </aside>
      </div>

      {drawer && <button type="button" className="scrim" aria-label="Close panel" onClick={() => setDrawer(null)} />}
    </>
  );
}
