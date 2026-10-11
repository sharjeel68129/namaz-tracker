import Footer from "../footer";
import TopBar from "../top-bar";
import { CONTACT_EMAIL, OPERATOR, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Terms",
  description: `The terms for using ${SITE_NAME}.`,
};

export default function Terms() {
  return (
    <>
      <TopBar />
      <main className="page wide legal">
        <h1>Terms</h1>
        <p className="muted">Last updated 11 October 2026</p>
        <p>
          {SITE_NAME} is a free personal tool run by {OPERATOR}. By creating an account you agree to the following.
        </p>

        <h2>What the site is</h2>
        <p>
          A record of the prayers you mark and a count of the Qaza you owe. The counts are only as accurate as what
          you enter. They are an aid to your own record keeping, not a religious ruling; for questions about what
          you owe, ask a scholar you trust.
        </p>

        <h2>Your account</h2>
        <p>
          Use an email address that is yours, keep your password to yourself, and do not try to access anyone
          else&apos;s account or disrupt the site.
        </p>

        <h2>No guarantee</h2>
        <p>
          The site is provided as it is, without any guarantee that it will always be available or free of mistakes.
          It may change or close, and data could be lost, so keep your own note of anything you cannot afford to
          lose. To the extent the law allows, the operator is not liable for loss arising from use of the site.
        </p>

        <h2>Ending your use</h2>
        <p>You can delete your account at any time in Settings. Accounts that misuse the site may be removed.</p>

        <h2>Changes</h2>
        <p>These terms may be updated; the date at the top shows the latest version.</p>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </main>
      <Footer />
    </>
  );
}
