"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "storage-notice-seen";

/** Shown once per browser: tells people what the site keeps in their browser. */
export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!window.localStorage.getItem(KEY));
    } catch {
      setShow(true); // storage is blocked, so the notice cannot be remembered
    }
  }, []);

  if (!show) return null;

  function onOk() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  return (
    <aside className="cookie-notice" aria-label="Cookies">
      <p>
        This site only stores what it needs to keep you logged in. No tracking or advertising cookies.{" "}
        <Link href="/privacy">Privacy</Link>
      </p>
      <button type="button" className="button" onClick={onOk}>
        OK
      </button>
    </aside>
  );
}
