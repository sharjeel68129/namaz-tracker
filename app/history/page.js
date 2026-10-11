"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dayKey, indexLogs } from "@/lib/days";
import { loadAccountData } from "@/lib/supabase";
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

  useEffect(() => {
    if (account.status === "out" || account.status === "unconfigured") router.replace("/auth");
  }, [account.status, router]);

  useEffect(() => {
    if (!userId) return;
    loadAccountData()
      .then((loaded) => (loaded.profile ? setData(loaded) : router.replace("/onboarding")))
      .catch((problem) => setError(`Your history could not be loaded: ${problem.message}`));
  }, [userId, router]);

  const logMap = useMemo(() => indexLogs(data?.logs || []), [data?.logs]);

  return (
    <>
    <TopBar email={account.user?.email} />
    <main className="page history">
      <h1>History</h1>
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
