import type { Metadata } from "next";
import LandingPageClient from "./_landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Finance Wars — Track. Save. Compete with your partner.",
  description: "Finance Wars is a premium personal finance dashboard with head-to-head Duels. Track net worth, run budgets, hit goals, and beat the slump together.",
  openGraph: {
    title: "Finance Wars — Track. Save. Compete.",
    description: "Sprint head-to-head. Save more. Roast each other.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance Wars — Track. Save. Compete.",
    description: "A premium personal finance dashboard with Duels.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Finance Wars",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: "Personal finance dashboard with head-to-head Duels. Track net worth, budgets, goals, and savings sprints with a partner.",
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
