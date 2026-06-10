import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import PWARegister from "./dashboard/_components/PWARegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-family",
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finance Wars — Take command of your money",
  description: "A premium personal finance dashboard. Track net worth, budgets, and goals in one beautiful place.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Finance Wars" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable} dark`} suppressHydrationWarning>
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
