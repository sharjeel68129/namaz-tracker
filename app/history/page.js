"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dayKey, indexLogs } from "@/lib/days";
import { loadForDevice } from "@/lib/offline";
import { useAccount } from "@/lib/use-account";
import History from "../app/history";
import TopBar from "../top-bar";

/** Past months and all-time statistics, opened from the History button in the tracker's sidebar. */
export default function HistoryPage() {
  const account = useAccount();
  const router = useRouter();
  const userId = account.user?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  useEffect(() => {
    if (!userId) return;
    loadForDevice(userId)
      .then((loaded) => {
        if (!loaded.data.profile) return router.replace("/onboarding");
        setData(loaded.data);
        setOffline(loaded.offline);
      })
      .catch((problem) => setError(`Your history could not be loaded: ${problem.message}`));
  }, [userId, router]);

  const logMap = useMemo(() => indexLogs(data?.logs || []), [data?.logs]);

  return (
    <>
    <TopBar email={account.user?.email} />
    <main className="page history">
      <h1>History</h1>
      {offline && (
        <p className="offline" role="status">
          You are offline, so this is the copy saved on this device.
        </p>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="muted">Loading your history…</p>}
      {data && (
        <History
          startDay={data.profile.start_day}
          today={dayKey(new Date())}
          logs={data.logs}
          qaza={data.qaza}
          logMap={logMap}
        />
      )}
    </main>
    </>
  );
}
