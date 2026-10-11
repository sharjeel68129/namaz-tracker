"use client";
import { useEffect, useState } from "react";
import { configured, supabase } from "./supabase";

/** Who is signed in. `status` is "loading", "in", "out", or "unconfigured" (no Supabase values yet). */
export function useAccount() {
  const [account, setAccount] = useState({ status: configured ? "loading" : "unconfigured", user: null });

  useEffect(() => {
    if (!configured) return;
    // Fires once straight away with the current session, then on every sign-in and sign-out.
    const { data } = supabase().auth.onAuthStateChange((_event, session) => {
      setAccount(session ? { status: "in", user: session.user } : { status: "out", user: null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return account;
}
