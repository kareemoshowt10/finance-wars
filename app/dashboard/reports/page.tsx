"use client";
import { Download, FileText } from "lucide-react";

function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const label = m.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    out.push({ key, label });
  }
  return out;
}

export default function ReportsPage() {
  const months = lastMonths(12);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Reports</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Generate monthly PDF statements.</p>
      </header>

      <div className="card divide-y divide-black/5 dark:divide-white/5">
        {months.map((m) => (
          <div key={m.key} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-black/40 dark:text-white/40" />
              <div>
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-black/40 dark:text-white/40">PDF statement • {m.key}</div>
              </div>
            </div>
            <a
              href={`/api/reports/monthly?month=${m.key}`}
              target="_blank"
              rel="noopener"
              className="btn-secondary"
            >
              <Download className="w-4 h-4" />Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
