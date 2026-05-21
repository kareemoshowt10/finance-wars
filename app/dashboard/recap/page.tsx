"use client";
import { useEffect, useState } from "react";
import { Calendar, TrendingUp, TrendingDown, Trophy, Flame, Swords, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Highlight = {
  kind: "achievement" | "boss-ko" | "vice-tax" | "streak" | "savings" | "warning";
  title: string;
  detail: string;
};

type Recap = {
  id: string;
  weekStart: string;
  weekEnd: string;
  income: number;
  spend: number;
  net: number;
  topCategory: string | null;
  topCategorySpend: number | null;
  biggestTxAmount: number | null;
  biggestTxDescription: string | null;
  txCount: number;
  viceTaxFunneled: number;
  debtPaid: number;
  bossesDefeated: number;
  netWorthDelta: number;
  achievementsUnlocked: number;
  highlights: Highlight[];
};

const ICONS: Record<Highlight["kind"], React.ComponentType<{ className?: string }>> = {
  achievement: Trophy,
  "boss-ko": Swords,
  "vice-tax": Flame,
  streak: Flame,
  savings: TrendingDown,
  warning: AlertTriangle,
};

const HIGHLIGHT_COLORS: Record<Highlight["kind"], string> = {
  achievement: "text-yellow-400 bg-yellow-500/10",
  "boss-ko": "text-violet-400 bg-violet-500/10",
  "vice-tax": "text-orange-400 bg-orange-500/10",
  streak: "text-orange-400 bg-orange-500/10",
  savings: "text-emerald-400 bg-emerald-500/10",
  warning: "text-red-400 bg-red-500/10",
};

export default function RecapPage() {
  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, me] = await Promise.all([
        fetch("/api/recap").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setRecaps(r?.recaps ?? r?.data?.recaps ?? []);
      if (me?.currency) setCurrency(me.currency);
      setLoading(false);
    })();
  }, []);

  const latest = recaps[0];
  const history = recaps.slice(1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] flex items-center gap-3">
          <Sparkles className="w-8 h-8" />Weekly Recap
        </h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">
          Your week, condensed. Every Monday morning.
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-black/50 dark:text-white/50">Loading…</div>
      ) : !latest ? (
        <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
          No recaps yet. Come back next Monday — your first review will land here.
        </div>
      ) : (
        <>
          <LatestCard recap={latest} currency={currency} />
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">Earlier weeks</h2>
              {history.map((r) => (
                <HistoryRow key={r.id} recap={r} currency={currency} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function formatRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function LatestCard({ recap, currency }: { recap: Recap; currency: string }) {
  const netPositive = recap.net >= 0;
  const nwPositive = recap.netWorthDelta >= 0;

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
          <Calendar className="w-3.5 h-3.5" />
          Week of {formatRange(recap.weekStart, recap.weekEnd)}
        </div>
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl font-semibold tracking-tight">
            {netPositive ? "+" : ""}{formatCurrency(recap.net, currency)}
          </span>
          <span className="text-sm text-black/50 dark:text-white/50">net cash flow</span>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Income" value={formatCurrency(recap.income, currency)} positive />
          <Stat label="Spend" value={formatCurrency(recap.spend, currency)} />
          <Stat
            label="Net worth Δ"
            value={`${nwPositive ? "+" : ""}${formatCurrency(recap.netWorthDelta, currency)}`}
            positive={nwPositive}
            negative={!nwPositive && recap.netWorthDelta < 0}
          />
          <Stat label="Transactions" value={String(recap.txCount)} />
        </div>

        {(recap.viceTaxFunneled > 0 || recap.debtPaid > 0 || recap.bossesDefeated > 0) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recap.viceTaxFunneled > 0 && (
              <MiniStat
                icon={<Flame className="w-4 h-4 text-orange-400" />}
                label="Vice tax"
                value={formatCurrency(recap.viceTaxFunneled, currency)}
              />
            )}
            {recap.debtPaid > 0 && (
              <MiniStat
                icon={<Swords className="w-4 h-4 text-violet-400" />}
                label="Debt attacked"
                value={formatCurrency(recap.debtPaid, currency)}
              />
            )}
            {recap.bossesDefeated > 0 && (
              <MiniStat
                icon={<Trophy className="w-4 h-4 text-yellow-400" />}
                label="Bosses KO'd"
                value={String(recap.bossesDefeated)}
              />
            )}
          </div>
        )}

        {recap.topCategory && (
          <div className="mt-5 text-sm text-black/60 dark:text-white/60">
            Biggest category: <span className="font-semibold text-black dark:text-white">{recap.topCategory}</span>
            {recap.topCategorySpend != null && (
              <span className="text-black/50 dark:text-white/50"> · {formatCurrency(recap.topCategorySpend, currency)}</span>
            )}
          </div>
        )}
        {recap.biggestTxAmount != null && recap.biggestTxDescription && (
          <div className="text-sm text-black/60 dark:text-white/60">
            Biggest hit: <span className="font-semibold text-black dark:text-white">{recap.biggestTxDescription}</span>
            <span className="text-black/50 dark:text-white/50"> · {formatCurrency(recap.biggestTxAmount, currency)}</span>
          </div>
        )}

        {recap.highlights.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-wider text-black/40 dark:text-white/40">Highlights</div>
            {recap.highlights.map((h, i) => {
              const Icon = ICONS[h.kind];
              return (
                <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${HIGHLIGHT_COLORS[h.kind]}`}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{h.title}</div>
                    <div className="text-xs opacity-80">{h.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ recap, currency }: { recap: Recap; currency: string }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs text-black/50 dark:text-white/50">{formatRange(recap.weekStart, recap.weekEnd)}</div>
        <div className="text-sm font-semibold mt-0.5">
          {recap.net >= 0 ? "+" : ""}{formatCurrency(recap.net, currency)}
          <span className="text-black/40 dark:text-white/40 ml-2 font-normal">· {recap.txCount} tx</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-black/50 dark:text-white/50 shrink-0">
        {recap.bossesDefeated > 0 && (
          <span className="flex items-center gap-1"><Swords className="w-3 h-3" />{recap.bossesDefeated}</span>
        )}
        {recap.achievementsUnlocked > 0 && (
          <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{recap.achievementsUnlocked}</span>
        )}
        {recap.viceTaxFunneled > 0 && (
          <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{formatCurrency(recap.viceTaxFunneled, currency)}</span>
        )}
        <ArrowRight className="w-4 h-4 opacity-30" />
      </div>
    </div>
  );
}

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${positive ? "text-emerald-500" : negative ? "text-red-500" : ""}`}>{value}</div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 p-3">
      {icon}
      <div className="min-w-0">
        <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
