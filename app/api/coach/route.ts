import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { matchIntent, DEFAULT_FOLLOW_UPS } from "@/lib/coach/intents";
import { evaluate } from "@/lib/achievements/engine";
import { getActiveHousehold } from "@/lib/household";
import { balanceOf, suggestSettlement } from "@/lib/billsplit";
import { getSharedView } from "@/lib/sharing";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

type ChartData = { type: "bar" | "progress" | "line"; data: { label: string; value: number }[] };

function monthRange(slot?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (slot === "last") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, label: "last month" };
  }
  if (slot && /^[a-z]+$/i.test(slot)) {
    const names = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const idx = names.indexOf(slot.toLowerCase());
    if (idx >= 0) {
      const year = idx > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
      const start = new Date(year, idx, 1);
      const end = new Date(year, idx + 1, 1);
      return { start, end, label: slot };
    }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, label: "this month" };
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "coach", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const message: string = String(body?.message || "");
  const intent = matchIntent(message);
  const userId = r.user.id;
  evaluate(userId, { type: "visit-coach" }).catch(() => {});

  let reply = "";
  let chart: ChartData | undefined;
  let followUps = DEFAULT_FOLLOW_UPS;

  // Resolve active household once, lazily reuse for household intents
  const activeHousehold = await getActiveHousehold(userId).catch(() => null);

  // For household intents, fall back if no household
  if (intent.name.startsWith("household-") && !activeHousehold) {
    return ok({
      reply: "You're not in a household yet. Create one from Couples to track shared bills, dates, and pact decisions together.",
      suggestedFollowUps: DEFAULT_FOLLOW_UPS,
    });
  }

  switch (intent.name) {
    case "household-ledger": {
      const hid = activeHousehold!.id;
      const balances = await balanceOf(hid);
      const members = await prisma.householdMember.findMany({
        where: { householdId: hid, accepted: true },
        include: { user: { select: { id: true, name: true } } },
      });
      const nameOf = (uid: string) => members.find((m) => m.userId === uid)?.user?.name || "Partner";
      const suggested = suggestSettlement(balances);
      if (!suggested) {
        reply = "You're square. No one owes anyone right now.";
      } else {
        reply = `${nameOf(suggested.from)} owes ${nameOf(suggested.to)} ${fmt(suggested.amount)}. Tap "Settle up" in Couples → Bills to clear it.`;
        chart = { type: "bar", data: balances.map((b) => ({ label: nameOf(b.userId), value: Math.round(b.net) })) };
      }
      break;
    }
    case "household-pact": {
      const hid = activeHousehold!.id;
      const pact = await prisma.pact.findUnique({ where: { householdId: hid } });
      const view = await getSharedView(userId, hid);
      if (!pact) { reply = "No pact set yet. Co-author one in Couples → The Pact."; break; }
      const issues: string[] = [];
      if (pact.emergencyFundFloor > 0) {
        const savings = view.accounts.filter((a) => a.type === "savings").reduce((s, a) => s + a.balance, 0);
        if (savings < pact.emergencyFundFloor) issues.push(`Emergency fund is at ${fmt(savings)} (below floor of ${fmt(pact.emergencyFundFloor)}).`);
      }
      if (pact.savingsRateMin > 0 && view.savingsRate < pact.savingsRateMin) {
        issues.push(`Savings rate is ${view.savingsRate}% (below pact minimum of ${pact.savingsRateMin}%).`);
      }
      if (view.pendingReviewsCount > 0) issues.push(`${view.pendingReviewsCount} big-purchase review${view.pendingReviewsCount === 1 ? "" : "s"} pending.`);
      reply = issues.length
        ? "Pact check — needs attention:\n" + issues.map((s) => `• ${s}`).join("\n")
        : "Pact check: all green. Emergency fund, savings rate, and reviews are in line.";
      break;
    }
    case "household-month": {
      const view = await getSharedView(userId, activeHousehold!.id);
      reply = `This month, the household pulled in ${fmt(view.monthIncome)} and spent ${fmt(view.monthSpend)} — a ${view.savingsRate}% savings rate. Net worth (shared view): ${fmt(view.netWorth)}.`;
      chart = { type: "bar", data: [{ label: "Income", value: view.monthIncome }, { label: "Spend", value: view.monthSpend }] };
      break;
    }
    case "household-top-bill": {
      const hid = activeHousehold!.id;
      const bills = await prisma.sharedBill.findMany({ where: { householdId: hid, active: true }, orderBy: { amount: "desc" }, take: 5 });
      if (!bills.length) { reply = "No shared bills tracked yet. Add some in Couples → Bills."; break; }
      const top = bills[0];
      reply = `Your biggest shared bill is ${top.name} at ${fmt(top.amount)}/${top.frequency.toLowerCase()}.`;
      chart = { type: "bar", data: bills.map((b) => ({ label: b.name, value: b.amount })) };
      break;
    }
    case "household-money-date": {
      const hid = activeHousehold!.id;
      const md = await prisma.moneyDate.findFirst({ where: { householdId: hid, status: { in: ["UPCOMING", "RESCHEDULED"] }, scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" } });
      reply = md
        ? `Next money date: ${md.scheduledAt.toLocaleString()} (${md.durationMin} min).`
        : "No money date scheduled. Set one up in Couples → Money Dates.";
      break;
    }
    case "status": {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const tx = await prisma.transaction.findMany({ where: { userId, date: { gte: start, lt: end } } });
      let income = 0, spend = 0;
      for (const t of tx) (t.type === "income" ? (income += t.amount) : (spend += t.amount));
      const rate = income > 0 ? ((income - spend) / income) * 100 : 0;
      reply = `This month: ${fmt(income)} in, ${fmt(spend)} out — that's a ${Math.round(rate)}% savings rate. ${rate >= 20 ? "Solid pace." : rate >= 0 ? "Tighten things up and you'll hit 20%." : "Spending is outpacing income — let's find some cuts."}`;
      chart = { type: "bar", data: [{ label: "Income", value: income }, { label: "Spend", value: spend }] };
      break;
    }
    case "spend-by-category": {
      const { start, end, label } = monthRange(intent.slots.month);
      const tx = await prisma.transaction.findMany({ where: { userId, type: "expense", date: { gte: start, lt: end } } });
      if (intent.slots.category) {
        const total = tx.filter((t) => t.category === intent.slots.category).reduce((s, t) => s + t.amount, 0);
        reply = `You spent ${fmt(total)} on ${intent.slots.category} ${label}.`;
      } else {
        const totals: Record<string, number> = {};
        for (const t of tx) totals[t.category] = (totals[t.category] || 0) + t.amount;
        const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        reply = `Top categories ${label}:\n` + top.map(([c, v], i) => `${i + 1}. ${c} — ${fmt(v)}`).join("\n");
        chart = { type: "bar", data: top.map(([c, v]) => ({ label: c, value: v })) };
      }
      break;
    }
    case "top-expenses": {
      const start = new Date(); start.setDate(start.getDate() - 30);
      const tx = await prisma.transaction.findMany({
        where: { userId, type: "expense", date: { gte: start } },
        orderBy: { amount: "desc" },
        take: 5,
      });
      if (!tx.length) { reply = "No expenses recorded yet. Add some transactions and I'll dig in."; break; }
      reply = "Your biggest expenses in the last 30 days:\n" + tx.map((t, i) => `${i + 1}. ${t.description} — ${fmt(t.amount)} (${t.category})`).join("\n");
      chart = { type: "bar", data: tx.map((t) => ({ label: t.description.slice(0, 18), value: t.amount })) };
      break;
    }
    case "subscriptions": {
      const recs = await prisma.recurringTransaction.findMany({ where: { userId, active: true, type: "expense" } });
      if (!recs.length) { reply = "No subscriptions tracked. Add recurring transactions to see them here."; break; }
      const total = recs.reduce((s, r) => s + r.amount, 0);
      reply = `You have ${recs.length} active subscriptions costing ${fmt(total)}/month:\n` + recs.slice(0, 8).map((r) => `• ${r.description} — ${fmt(r.amount)}`).join("\n");
      chart = { type: "bar", data: recs.slice(0, 6).map((r) => ({ label: r.description.slice(0, 18), value: r.amount })) };
      break;
    }
    case "goal-on-track": {
      const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { deadline: "asc" } });
      if (!goals.length) { reply = "You don't have any goals yet. Create one and I'll track it for you."; break; }
      const lines = goals.slice(0, 4).map((g) => {
        const pct = Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100);
        const days = Math.max(0, Math.ceil((g.deadline.getTime() - Date.now()) / 86400000));
        const remaining = Math.max(0, g.targetAmount - g.currentAmount);
        const perDay = days > 0 ? remaining / days : remaining;
        return `• ${g.name}: ${pct}% (${fmt(g.currentAmount)}/${fmt(g.targetAmount)}) — ${days} days left, ~${fmt(perDay)}/day to finish`;
      });
      reply = "Goal check:\n" + lines.join("\n");
      chart = { type: "progress", data: goals.slice(0, 4).map((g) => ({ label: g.name, value: Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100) })) };
      break;
    }
    case "save-suggestion": {
      const recs = await prisma.recurringTransaction.findMany({ where: { userId, active: true, type: "expense" } });
      const subsTotal = recs.reduce((s, r) => s + r.amount, 0);
      const start = new Date(); start.setDate(start.getDate() - 30);
      const tx = await prisma.transaction.findMany({ where: { userId, type: "expense", date: { gte: start } } });
      const totals: Record<string, number> = {};
      for (const t of tx) totals[t.category] = (totals[t.category] || 0) + t.amount;
      const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
      const tips = [
        `Cancel one subscription: you're paying ${fmt(subsTotal)}/month across ${recs.length} services.`,
        top ? `Trim your top category ${top[0]} (${fmt(top[1])}) by 15% — save ~${fmt(top[1] * 0.15)}/mo.` : "Track a few weeks of spending first so I can spot patterns.",
        "Run the Scenarios simulator to see how $200/mo extra savings compounds.",
      ];
      reply = "Here's what stands out:\n" + tips.map((t) => `• ${t}`).join("\n");
      break;
    }
    default:
      reply = "I'm a rule-based coach. Try one of these:";
      followUps = DEFAULT_FOLLOW_UPS;
  }

  return ok({ reply, chart, suggestedFollowUps: followUps });
}
