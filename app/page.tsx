import type { Metadata } from "next";
import LandingPageClient from "./_landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Debt Sucker — Become the bank. Run the household.",
  description: "Debt Sucker is the household finance app that's also a game: family loans with real accountability, chores that pay Crowns and XP, and shared goals for the PS5, the pool, and the bathroom remodel that keeps getting put off.",
  openGraph: {
    title: "Debt Sucker — Become the bank. Run the household.",
    description: "Family loans, chores, and shared goals — one scoreboard for the whole household.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Debt Sucker — Become the bank. Run the household.",
    description: "A household finance app that's also a game: loans, chores, and shared goals.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Debt Sucker",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: "Household finance app and game. Track family loans, chores, and shared goals — with net worth, budgets, and savings tools underneath it all.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "128" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPageClient />
    </>
  );
}
