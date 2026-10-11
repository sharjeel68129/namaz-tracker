import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import CookieNotice from "./cookie-notice";
import "./globals.css";

// Self-hosted by Next at build time, so no font request leaves the browser.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // Each page's layout gives its own title, shown as "History | Namaz Tracker".
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website", title: SITE_NAME, description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Namaz", statusBarStyle: "black" },
};

// Colours the phone's status bar to match the page.
export const viewport = { themeColor: "#171614" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <CookieNotice />
        <Analytics />
      </body>
    </html>
  );
}
