import Link from "next/link";
import Footer from "./footer";
import TopBar from "./top-bar";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="page">
        <h1>This page does not exist</h1>
        <p className="muted">The address may be mistyped, or the page may have moved.</p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link className="button" href="/">
            Go to the home page
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
