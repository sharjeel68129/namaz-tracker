"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAYERS, addDays, dayKey, daysBetween, expiredUnlogged, indexLogs, visibleCards } from "@/lib/days";
import { hijriDate } from "@/lib/hijri";
import { applyChange, isNetworkError, loadForDevice, queueChange, sendPending, stamp, writeCache } from "@/lib/offline";
import { chartCells, owedCounts, perfectStreak, rangeStats } from "@/lib/stats";
import { addAutoMissed, deviceTimezone, updateProfile } from "@/lib/supabase";
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
  const [offline, setOffline] = useState(false); // showing the copy saved on this device
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

  // Send anything saved while offline, then load. Done again whenever the connection returns.
  useEffect(() => {
    if (!userId) return;
    let live = true;
    async function load() {
      const sent = await sendPending(userId);
      if (sent.failed.length) setError(`Some changes made offline were not saved: ${sent.failed.join("; ")}`);
      const loaded = await loadForDevice(userId);
      if (!live) return;
      if (!loaded.data.profile) return router.replace("/onboarding");
      setData(loaded.data);
      setOffline(loaded.offline || sent.offline);
      // Keep the reminder email on the user's current clock if they have moved time zone.
      if (!loaded.offline && loaded.data.profile.timezone !== deviceTimezone()) {
        updateProfile(userId, { timezone: deviceTimezone() }).catch(() => {});
      }
    }
    const reload = () => load().catch((problem) => live && setError(`Your prayers could not be loaded: ${problem.message}`));
    const lost = () => setOffline(true);
    reload();
    window.addEventListener("online", reload);
    window.addEventListener("offline", lost);
    return () => {
      live = false;
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", lost);
    };
  }, [userId, router]);

  // Keep this device's copy up to date, so the page opens with no connection.
  useEffect(() => {
    if (userId && data?.profile) writeCache(userId, data);
  }, [userId, data]);

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
    const show = () => {
      if (!live) return;
      const loggedAt = new Date().toISOString();
      setData((d) => {
        const have = indexLogs(d.logs);
        const fresh = rows.filter((row) => !have.has(`${row.day}|${row.prayer}`));
        return { ...d, logs: [...d.logs, ...fresh.map((row) => ({ ...row, logged_at: loggedAt }))] };
      });
    };
    // Offline they are shown anyway; they are worked out again and saved on the next online visit.
    addAutoMissed(rows)
      .then(show)
      .catch((problem) => {
        if (isNetworkError(problem)) show();
        else if (live) setError(`Expired prayers could not be saved as missed: ${problem.message}`);
      });
    return () => {
      live = false;
    };
  }, [today, startDay]);

  const logMap = useMemo(() => indexLogs(data?.logs || []), [data?.logs]);

  // The top bar is already there while loading, so the page does not jump when the data arrives.
  if (error && !data) {
    return (
      <>
        <TopBar email={account.user?.email} />
        <main className="page">
          <p className="alert" role="alert">
            {error}
          </p>
        </main>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <TopBar email={account.user?.email} />
        <main className="page">
          <p className="muted" aria-live="polite">
            Loading your prayers…
          </p>
        </main>
      </>
    );
  }

  const { profile, logs, qaza } = data;
  const owed = owedCounts(profile.start_qaza, logs, qaza);
  const cards = visibleCards(now, profile.start_day, logMap);
  const last30 = addDays(today, -29);
  const pastLeft = cards.past.filter((card) => !card.log).length;

  const streak = perfectStreak(today, profile.start_day, logMap);

  /**
   * Every change shows at once and is saved on this device, then sent. If Supabase refuses one,
   * the page reloads what is really saved so it never shows something that was not kept.
   */
  async function change(details) {
    const stamped = stamp(details);
    queueChange(userId, stamped);
    setData((d) => applyChange(d, stamped));
    setError("");
    const sent = await sendPending(userId);
    setOffline(sent.offline);
    if (sent.failed.length) {
      setError(`Not saved: ${sent.failed.join("; ")}`);
      loadForDevice(userId).then((loaded) => setData(loaded.data)).catch(() => {});
    }
  }

  const onLog = (day, prayer, status) => change({ type: "log", day, prayer, status });
  const onUndo = (day, prayer) => change({ type: "undo", day, prayer });
  const onSaveQaza = (prayer, date, count) => change({ type: "qaza", prayer, date, count });

  const renderCard = ({ day, prayer, log }) => (
    <PrayerCard
      key={`${day}|${prayer.id}`}
      prayer={prayer}
      log={log}
      owed={owed[prayer.id]}
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
          <div className="today-head">
            <h2>Today</h2>
            <span className="hijri">{hijriDate(now)}</span>
            {streak > 0 && (
              <span className="streak" title="Days in a row with all five prayed">
                {streak}-day streak
              </span>
            )}
          </div>
          {offline && (
            <p className="offline" role="status">
              You are offline. Changes are saved on this device and sent when you are back online.
            </p>
          )}
          {error && (
            <p className="alert" role="alert" style={{ marginBottom: "0.75rem" }}>
              {error}
            </p>
          )}
          <ul className="prayers">{cards.today.map(renderCard)}</ul>

          {/* Folded away so the page fits one screen; the heading says how many are left. */}
          {cards.past.length > 0 && (
            <details className="past">
              <summary>
                Yesterday
                <span className="past-count">{pastLeft ? `${pastLeft} still to log` : "All logged"}</span>
              </summary>
              <ul className="prayers">{cards.past.map(renderCard)}</ul>
            </details>
          )}

          <div className="chart-head">
            <h2>Last 30 days</h2>
            <button
              type="button"
              className="button quiet"
              aria-expanded={showStats}
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? "Hide statistics" : "Show statistics"}
            </button>
          </div>
          <Chart legend cells={chartCells(daysBetween(last30, today), profile.start_day, today, logMap)} />
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
