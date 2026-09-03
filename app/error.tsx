"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, AlertTriangle } from "lucide-react";

/**
 * Catches a render/data error anywhere under the root layout. Without this,
 * Next.js shows a bare "Application error: a client-side exception has
 * occurred" in production — no explanation and no way back.
 *
 * `reset()` re-renders the failed segment, which is enough to recover from a
 * transient fetch failure without a full reload; the links are there for
 * when it isn't.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Reaches the server logs (and whatever error reporter is wired up later)
    // rather than dying silently in the user's console.
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-black">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-6">Something broke on our end</h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Nothing you did — this one&apos;s ours. Your data is safe. Try again, and if it keeps
          happening, head back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-4 text-[11px] font-mono text-black/30 dark:text-white/30">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary"><RotateCw className="w-4 h-4" /> Try again</button>
          <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
