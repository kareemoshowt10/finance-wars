import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Shown when a plan limit blocks an action — the 402 response from an API route always carries `upgrade: true`. */
export default function UpgradeNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm flex items-start gap-2">
      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
      <div className="flex-1 text-indigo-700 dark:text-indigo-300">
        {message}{" "}
        <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
          See plans →
        </Link>
      </div>
    </div>
  );
}

/** True if an API error response indicates a plan-limit block (status 402 shape: { error, upgrade: true, planId }). */
export function isUpgradeError(data: unknown): data is { error: string; upgrade: true; planId: string } {
  return !!data && typeof data === "object" && (data as { upgrade?: unknown }).upgrade === true;
}
