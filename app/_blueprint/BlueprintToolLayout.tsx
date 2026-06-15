"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { BlueprintNav, BlueprintFooter, BlueprintThemeBoundary } from "./BlueprintShell";

export default function BlueprintToolLayout({
  number, callsign, title, subtitle, children,
}: {
  number: string; callsign: string;
  title: string; subtitle: string; children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <BlueprintThemeBoundary />
      <BlueprintNav active="tools" />

      <main className="max-w-[1240px] mx-auto px-6 pt-16 pb-20">
        <Link href="/learn" className="bp-callsign hover:text-[var(--bp-signal)]">← INDEX</Link>

        <header className="mt-10 grid md:grid-cols-[160px_1fr] gap-8 pb-10 border-b border-[var(--bp-rule)]">
          <div>
            <div className="bp-callsign">DOC {number}</div>
            <div className="bp-callsign mt-1">{callsign}</div>
          </div>
          <div>
            <h1 className="bp-display">{title}</h1>
            <p className="bp-body mt-4 max-w-2xl">{subtitle}</p>
          </div>
        </header>

        <div className="mt-10">{children}</div>
      </main>

      <BlueprintFooter />
    </div>
  );
}

// Reusable inputs / output presentation primitives for tool pages -----------

export function BPField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="bp-callsign">{label}</span>
        {hint && <span className="bp-callsign text-[var(--bp-mute)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function BPNumber({ label, value, accent }: { label: string; value: string; accent?: "signal" | "blueprint" | "strike" }) {
  const color =
    accent === "signal" ? "var(--bp-signal)" :
    accent === "blueprint" ? "var(--bp-blueprint)" :
    accent === "strike" ? "var(--bp-strike)" :
    "var(--bp-ink)";
  return (
    <div className="bp-card">
      <div className="bp-callsign">{label}</div>
      <div className="bp-fig mt-2" style={{ fontSize: "32px", color }}>{value}</div>
    </div>
  );
}

export function BPSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="bp-section-marker">{label}</div>
      {children}
    </section>
  );
}
