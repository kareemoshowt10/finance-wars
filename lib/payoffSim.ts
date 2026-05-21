import type { DebtBoss } from "./debtBoss";

export type Strategy = "avalanche" | "snowball" | "even";

export type PayoffMonth = {
  month: number;
  date: string;
  totalBalance: number;
  totalInterestPaid: number;
  perBoss: { accountId: string; balance: number; paid: number; interest: number }[];
};

export type PayoffResult = {
  months: PayoffMonth[];
  payoffMonths: number | null;
  totalInterest: number;
  totalPaid: number;
  defeatOrder: { accountId: string; name: string; month: number }[];
};

export type SimInput = {
  bosses: Pick<DebtBoss, "accountId" | "name" | "hp" | "apr" | "dps30">[];
  extraMonthly: number; // additional payment on top of current DPS
  strategy: Strategy;
  horizonMonths?: number; // safety cap, default 360
};

export function simulatePayoff(input: SimInput): PayoffResult {
  const horizon = input.horizonMonths ?? 360;
  type S = { accountId: string; name: string; balance: number; apr: number; base: number };
  const state: S[] = input.bosses
    .filter((b) => b.hp > 0)
    .map((b) => ({
      accountId: b.accountId,
      name: b.name,
      balance: b.hp,
      apr: b.apr ?? 0,
      base: b.dps30 ?? 0,
    }));

  const months: PayoffMonth[] = [];
  const defeatOrder: { accountId: string; name: string; month: number }[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  const start = new Date();
  start.setDate(1);

  for (let m = 1; m <= horizon; m++) {
    if (state.every((s) => s.balance <= 0.01)) break;

    // Apply interest first.
    const perBoss: PayoffMonth["perBoss"] = [];
    for (const s of state) {
      if (s.balance <= 0) {
        perBoss.push({ accountId: s.accountId, balance: 0, paid: 0, interest: 0 });
        continue;
      }
      const interest = s.balance * (s.apr / 100 / 12);
      s.balance += interest;
      totalInterest += interest;
      perBoss.push({ accountId: s.accountId, balance: s.balance, paid: 0, interest });
    }

    // Compute payments: each boss gets its base; extra goes per strategy.
    const totalBudget =
      state.reduce((sum, s) => sum + (s.balance > 0 ? s.base : 0), 0) + Math.max(0, input.extraMonthly);

    const alive = state.filter((s) => s.balance > 0);

    // Allocate base payments first (capped at remaining balance).
    let remaining = totalBudget;
    for (const s of alive) {
      const pay = Math.min(s.balance, s.base);
      s.balance -= pay;
      remaining -= pay;
      const entry = perBoss.find((p) => p.accountId === s.accountId)!;
      entry.paid += pay;
      entry.balance = s.balance;
    }

    // Distribute remaining per strategy.
    while (remaining > 0.01) {
      const stillAlive = state.filter((s) => s.balance > 0);
      if (stillAlive.length === 0) break;

      let targets: S[];
      if (input.strategy === "avalanche") {
        const maxApr = Math.max(...stillAlive.map((s) => s.apr));
        targets = stillAlive.filter((s) => s.apr === maxApr);
      } else if (input.strategy === "snowball") {
        const minBal = Math.min(...stillAlive.map((s) => s.balance));
        targets = stillAlive.filter((s) => s.balance === minBal);
      } else {
        targets = stillAlive;
      }

      const share = remaining / targets.length;
      let spent = 0;
      for (const t of targets) {
        const pay = Math.min(t.balance, share);
        t.balance -= pay;
        spent += pay;
        const entry = perBoss.find((p) => p.accountId === t.accountId)!;
        entry.paid += pay;
        entry.balance = t.balance;
      }
      if (spent <= 0) break;
      remaining -= spent;
    }

    for (const s of state) {
      if (s.balance <= 0.01 && !defeatOrder.find((d) => d.accountId === s.accountId)) {
        defeatOrder.push({ accountId: s.accountId, name: s.name, month: m });
        s.balance = 0;
      }
    }

    const monthDate = new Date(start);
    monthDate.setMonth(monthDate.getMonth() + m);
    const totalBalance = state.reduce((sum, s) => sum + s.balance, 0);
    const monthPaid = perBoss.reduce((sum, p) => sum + p.paid, 0);
    totalPaid += monthPaid;
    months.push({
      month: m,
      date: monthDate.toISOString().slice(0, 10),
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalInterestPaid: Math.round(totalInterest * 100) / 100,
      perBoss: perBoss.map((p) => ({
        ...p,
        balance: Math.round(p.balance * 100) / 100,
        paid: Math.round(p.paid * 100) / 100,
        interest: Math.round(p.interest * 100) / 100,
      })),
    });
  }

  const payoffMonths = state.every((s) => s.balance <= 0.01) ? months.length : null;
  return {
    months,
    payoffMonths,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    defeatOrder,
  };
}
