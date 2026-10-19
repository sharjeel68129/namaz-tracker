"use client";
import { useEffect } from "react";

/** Registers public/sw.js, which keeps the pages so the installed app opens offline. */
export default function OfflineSupport() {
  useEffect(() => {
    // Left off while developing, where a kept page would hide code changes.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
