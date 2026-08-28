"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="card p-8 max-w-md text-center">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
        <h1 className="text-xl font-semibold mt-4">Something went wrong</h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">Sorry — that&apos;s on us. Try again, and if it keeps happening, let us know.</p>
        {error?.digest && <div className="mt-3 text-[10px] opacity-40 font-mono">ref: {error.digest}</div>}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => reset()} className="btn-primary"><RefreshCw className="w-4 h-4" />Try again</button>
          <a href="mailto:support@debtsucker.app?subject=Report" className="btn-secondary"><Mail className="w-4 h-4" />Report</a>
        </div>
      </div>
    </div>
  );
}
