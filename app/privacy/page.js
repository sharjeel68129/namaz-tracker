import Footer from "../footer";
import TopBar from "../top-bar";
import { CONTACT_EMAIL, OPERATOR, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Privacy",
  description: `What ${SITE_NAME} stores about you, where it is kept, and how to delete it.`,
};

export default function Privacy() {
  return (
    <>
      <TopBar />
      <main className="page wide legal">
        <h1>Privacy</h1>
        <p className="muted">Last updated 19 October 2026</p>
        <p>
          {SITE_NAME} is run by {OPERATOR}. This page says what the site stores about you and what you can do about
          it.
        </p>

        <h2>What is stored</h2>
        <ul>
          <li>Your email address, and your password in a scrambled form that nobody can read, including us.</li>
          <li>The prayers you mark as prayed or missed, and the day each belongs to.</li>
          <li>The Qaza you log, and the starting numbers you entered when you signed up.</li>
          <li>Your time zone and whether the reminder email is switched on.</li>
        </ul>

        <h2>Where it is kept</h2>
        <p>
          Accounts and data are kept by Supabase, the website is served by Vercel, and emails are sent by Brevo.
          These companies store and deliver data on our behalf. Only your own account can read your prayer records.
        </p>
        <p>
          So the app works without a connection, a copy of your records is also kept in your browser on each device
          you use. It is removed when you log out, reset your data or delete your account.
        </p>

        <h2>Emails</h2>
        <p>
          You get an email to confirm your address and when you ask to reset your password. If the reminder is
          switched on in Settings, you may also get an email at 6PM when yesterday&apos;s prayers are not logged.
          There are no marketing emails.
        </p>

        <h2>Cookies and visit counts</h2>
        <p>
          The site keeps data in your browser so you stay logged in, to keep the offline copy described above, and
          to remember that you have seen the cookie notice. It uses no advertising or tracking cookies. Page visits are counted with Vercel
          Analytics, which uses no cookies and does not identify you.
        </p>

        <h2>Sharing</h2>
        <p>Your data is not sold, and it is not shared with anyone beyond the three companies named above.</p>

        <h2>Deleting your data</h2>
        <p>
          In Settings, &quot;Reset all data&quot; removes every prayer and Qaza record, and &quot;Delete account&quot;
          removes your account and everything in it. Both take effect straight away and cannot be undone.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or requests about your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </main>
      <Footer />
    </>
  );
}
