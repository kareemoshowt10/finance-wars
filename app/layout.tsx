import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import PWARegister from "./dashboard/_components/PWARegister";
import { siteUrl } from "@/lib/siteUrl";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-family",
  weight: ["500", "600"],
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

const TITLE = "Debt Sucker — Become the bank. Run the household.";
const DESCRIPTION =
  "The household finance app that's also a game: family loans, chores, and shared goals — with debt, chores, and teamwork all on one scoreboard.";

export const metadata: Metadata = {
  // Makes every relative URL below (and app/opengraph-image.tsx) resolve to an
  // absolute one, which is the only kind link unfurlers accept.
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Debt Sucker",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Debt Sucker" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  openGraph: {
    type: "website",
    siteName: "Debt Sucker",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // Lets the app draw under the notch/home-indicator so env(safe-area-inset-*)
  // resolves to real values instead of 0 — needed for the mobile tab bar.
  viewportFit: "cover",
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('fw-theme');
    if (!t) t = 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) { document.documentElement.classList.add('dark'); }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${bricolage.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
