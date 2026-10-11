import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

/** Links to the legal pages and the contact address, under the pages people see before logging in. */
export default function Footer() {
  return (
    <footer className="footer">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </footer>
  );
}
