"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { maskEmail } from "@/lib/stats";

const LINKS = [
  ["/app", "Prayers"],
  ["/history", "History"],
];

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * The bar across the top of every page. Signed in (an `email` is passed): the settings gear,
 * the masked email, and links to the other pages. Signed out: just the name, linking home.
 * `children` go at the end of the bar (the tracker puts its phone drawer buttons there).
 */
export default function TopBar({ email, children }) {
  const path = usePathname();
  const current = (href) => (path === href ? "page" : undefined);

  if (!email) {
    return (
      <header className="topbar">
        <Link className="wordmark" href="/">
          Namaz Tracker
        </Link>
      </header>
    );
  }
  return (
    <header className="topbar">
      <Link className="gear" href="/settings" aria-label="Settings" aria-current={current("/settings")}>
        <GearIcon />
      </Link>
      <span className="email">{maskEmail(email)}</span>
      <nav className="topnav" aria-label="Pages">
        {LINKS.map(([href, name]) => (
          <Link key={href} href={href} aria-current={current(href)}>
            {name}
          </Link>
        ))}
      </nav>
      {children}
    </header>
  );
}
