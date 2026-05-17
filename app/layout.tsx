import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Finance Wars — Take command of your money",
  description: "A premium personal finance dashboard. Track net worth, budgets, and goals in one beautiful place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-black text-white antialiased">{children}</body>
    </html>
  );
}
