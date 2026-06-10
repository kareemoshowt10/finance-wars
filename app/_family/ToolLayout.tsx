"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FamilyNav, FamilyFooter } from "@/app/_family/FamilyShell";
import FamilyThemeBoundary from "@/app/_family/FamilyThemeBoundary";

export default function ToolLayout({
  title,
  subtitle,
  icon,
  character,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  character?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <FamilyThemeBoundary />
      <FamilyNav active="learn" />
      <main className="max-w-[860px] mx-auto px-6 pt-16 pb-16">
        <Link href="/learn" className="family-link text-[13px]"><ArrowLeft className="w-3 h-3" />All tools</Link>
        <header className="relative pt-4 pb-8">
          <div className="flex items-start gap-5">
            <div className="shrink-0">{icon}</div>
            <div>
              <h1 className="family-heading-lg text-[#121212]">{title}</h1>
              <p className="family-body mt-3 max-w-xl">{subtitle}</p>
            </div>
          </div>
          {character && <div className="absolute -top-2 right-0 hidden md:block">{character}</div>}
        </header>
        {children}
      </main>
      <FamilyFooter />
    </div>
  );
}
