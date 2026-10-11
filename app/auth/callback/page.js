"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/use-account";

/**
 * Where the confirmation and password-reset emails land. The Supabase client reads the code in
 * the URL and signs the person in; this page just waits for that and sends them on. If the link
 * was opened in a different browser there is no session, so they are asked to log in instead.
 */
export default function AuthCallback() {
  const account = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (account.status === "loading") return;
    const toSettings = new URLSearchParams(window.location.search).get("next") === "settings";
    if (account.status === "in") router.replace(toSettings ? "/settings" : "/app");
    else router.replace("/auth?confirmed=1");
  }, [account.status, router]);

  return (
    <main className="page">
      <p className="muted" aria-live="polite">
        Signing you in…
      </p>
    </main>
  );
}
