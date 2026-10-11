import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time, so no font request leaves the browser.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "Namaz Tracker",
  description: "Log your five daily prayers and keep count of the Qaza you owe.",
  appleWebApp: { capable: true, title: "Namaz", statusBarStyle: "black" },
};

// Colours the phone's status bar to match the page.
export const viewport = { themeColor: "#171614" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
