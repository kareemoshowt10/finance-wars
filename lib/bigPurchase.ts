// Personal-finance math for the homeowner + car-owner toolkit.
// All pure functions, fully unit-testable, no I/O.

// ---- Mortgage / Home -------------------------------------------------------

// Standard amortized monthly payment.
export function monthlyMortgagePayment(principal: number, aprPct: number, years: number): number {
  if (principal <= 0) return 0;
  const n = years * 12;
  const r = aprPct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// PITI = Principal+Interest + Taxes + Insurance + (optional) HOA + PMI.
export type PITI = {
  principalInterest: number;
  taxes: number;       // monthly
  insurance: number;   // monthly
  hoa: number;
  pmi: number;
  total: number;
};

export function computePITI({
  homePrice, downPayment, aprPct, years,
  annualTaxRatePct, annualInsurance, monthlyHOA, pmiAnnualRatePct,
}: {
  homePrice: number; downPayment: number; aprPct: number; years: number;
  annualTaxRatePct: number; annualInsurance: number;
  monthlyHOA: number; pmiAnnualRatePct?: number;
}): PITI {
  const loan = Math.max(0, homePrice - downPayment);
  const pi = monthlyMortgagePayment(loan, aprPct, years);
  const taxes = (homePrice * (annualTaxRatePct / 100)) / 12;
  const insurance = annualInsurance / 12;
  const ltv = homePrice > 0 ? loan / homePrice : 0;
  // PMI typically applies when LTV > 80%.
  const pmiRate = (pmiAnnualRatePct ?? 0.6); // 0.6% default
  const pmi = ltv > 0.8 ? (loan * (pmiRate / 100)) / 12 : 0;
  const total = pi + taxes + insurance + monthlyHOA + pmi;
  return {
    principalInterest: round2(pi),
    taxes: round2(taxes),
    insurance: round2(insurance),
    hoa: round2(monthlyHOA),
    pmi: round2(pmi),
    total: round2(total),
  };
}

// Reverse: given a max monthly housing budget, what home price can you afford?
// Solves PITI(price) = budget by binary search (tax + PMI make it non-linear).
export function maxAffordableHomePrice(opts: {
  monthlyBudget: number; downPayment: number; aprPct: number; years: number;
  annualTaxRatePct: number; annualInsurance: number;
  monthlyHOA: number; pmiAnnualRatePct?: number;
}): number {
  if (opts.monthlyBudget <= 0) return opts.downPayment;
  let lo = opts.downPayment;
  let hi = opts.downPayment + opts.monthlyBudget * 12 * opts.years * 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const piti = computePITI({ ...opts, homePrice: mid });
    if (piti.total > opts.monthlyBudget) hi = mid; else lo = mid;
  }
  return round2(lo);
}

// 28/36 rule: housing ≤ 28% of gross monthly, all debts ≤ 36%.
export function debtToIncome({
  grossMonthlyIncome, monthlyHousing, otherMonthlyDebts,
}: { grossMonthlyIncome: number; monthlyHousing: number; otherMonthlyDebts: number }) {
  const frontEnd = grossMonthlyIncome > 0 ? monthlyHousing / grossMonthlyIncome : 0;
  const backEnd = grossMonthlyIncome > 0 ? (monthlyHousing + otherMonthlyDebts) / grossMonthlyIncome : 0;
  return {
    frontEnd: round3(frontEnd),
    backEnd: round3(backEnd),
    frontEndOk: frontEnd <= 0.28,
    backEndOk: backEnd <= 0.36,
  };
}

// ---- Mortgage payoff with extra principal payments ------------------------

export type PayoffResult = {
  baseMonths: number;
  acceleratedMonths: number;
  monthsSaved: number;
  baseInterest: number;
  acceleratedInterest: number;
  interestSaved: number;
  payoffDate: string; // ISO yyyy-mm
};

export function mortgagePayoff({
  loan, aprPct, years, extraMonthly,
}: { loan: number; aprPct: number; years: number; extraMonthly: number }): PayoffResult {
  const basePmt = monthlyMortgagePayment(loan, aprPct, years);
  const r = aprPct / 100 / 12;

  const runScenario = (extra: number) => {
    let balance = loan;
    let interest = 0;
    let m = 0;
    const cap = years * 12 * 2 + 12;
    while (balance > 0.01 && m < cap) {
      m++;
      const i = balance * r;
      interest += i;
      const pay = Math.min(balance + i, basePmt + extra);
      balance = Math.max(0, balance + i - pay);
    }
    return { months: m, interest };
  };

  const base = runScenario(0);
  const accel = runScenario(extraMonthly);
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + accel.months);

  return {
    baseMonths: base.months,
    acceleratedMonths: accel.months,
    monthsSaved: base.months - accel.months,
    baseInterest: round2(base.interest),
    acceleratedInterest: round2(accel.interest),
    interestSaved: round2(base.interest - accel.interest),
    payoffDate: payoff.toISOString().slice(0, 7),
  };
}

// ---- Down payment savings plan -------------------------------------------

export type SavingsPlan = {
  required: number;
  current: number;
  gap: number;
  monthsToReady: number | null;
  readyDate: string | null;
  perMonthFor3Years: number;
  perMonthFor5Years: number;
};

export function downPaymentPlan({
  homePrice, downPct, currentlySaved, monthlySaving, apyPct,
}: {
  homePrice: number; downPct: number; currentlySaved: number;
  monthlySaving: number; apyPct: number;
}): SavingsPlan {
  const required = homePrice * (downPct / 100);
  const gap = Math.max(0, required - currentlySaved);

  // FV of current savings + monthly contributions, find n such that FV >= required.
  const r = apyPct / 100 / 12;
  const fv = (months: number) => {
    let balance = currentlySaved;
    for (let i = 0; i < months; i++) balance = balance * (1 + r) + monthlySaving;
    return balance;
  };

  let monthsToReady: number | null = null;
  if (currentlySaved >= required) {
    monthsToReady = 0;
  } else if (monthlySaving > 0 || r > 0) {
    for (let m = 1; m <= 600; m++) {
      if (fv(m) >= required) { monthsToReady = m; break; }
    }
  }

  const requiredMonthlyOver = (months: number) => {
    // Solve for monthly contribution so FV(months) = required.
    // FV = currentlySaved*(1+r)^n + P * ((1+r)^n - 1)/r
    if (months <= 0) return 0;
    const factor = Math.pow(1 + r, months);
    const fromCurrent = currentlySaved * factor;
    const remaining = required - fromCurrent;
    if (remaining <= 0) return 0;
    if (r === 0) return remaining / months;
    return remaining / ((factor - 1) / r);
  };

  let readyDate: string | null = null;
  if (monthsToReady != null) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToReady);
    readyDate = d.toISOString().slice(0, 7);
  }

  return {
    required: round2(required),
    current: round2(currentlySaved),
    gap: round2(gap),
    monthsToReady,
    readyDate,
    perMonthFor3Years: round2(requiredMonthlyOver(36)),
    perMonthFor5Years: round2(requiredMonthlyOver(60)),
  };
}

// ---- Car affordability (20/4/10 rule + total cost of ownership) ----------

export type CarAffordability = {
  twentyDownTarget: number;            // suggested 20% down
  fourYearMaxLoan: number;             // max loan that fits 4-yr term + 10% rule
  tenPercentBudget: number;            // 10% of monthly income
  maxMonthlyLoanPayment: number;       // loan payment ceiling under 10% rule
  maxCarPrice: number;
  monthlyTCO: number;                  // loan + insurance + fuel + maintenance
  loanMonthly: number;
};

export function carAffordability({
  monthlyTakeHome, downPayment, aprPct, years,
  monthlyInsurance, monthlyFuel, monthlyMaintenance,
}: {
  monthlyTakeHome: number; downPayment: number; aprPct: number; years: number;
  monthlyInsurance: number; monthlyFuel: number; monthlyMaintenance: number;
}): CarAffordability {
  // 20/4/10 rule: 20% down, ≤4yr loan, total transport ≤10% of take-home.
  const tenPercentBudget = monthlyTakeHome * 0.10;
  const otherCosts = monthlyInsurance + monthlyFuel + monthlyMaintenance;
  const maxLoanPmt = Math.max(0, tenPercentBudget - otherCosts);
  // Reverse: loan principal that fits maxLoanPmt at the given APR/term.
  const r = aprPct / 100 / 12;
  const n = years * 12;
  let maxLoan = 0;
  if (maxLoanPmt > 0 && n > 0) {
    if (r === 0) maxLoan = maxLoanPmt * n;
    else maxLoan = (maxLoanPmt * (1 - Math.pow(1 + r, -n))) / r;
  }
  const maxCarPrice = downPayment + maxLoan;
  // For 20% down to hold, target price where downPayment ~= 20% × price.
  const twentyDownTarget = downPayment > 0 ? downPayment / 0.20 : 0;
  const loanPmtAtMax = maxLoanPmt;
  const tco = loanPmtAtMax + otherCosts;
  return {
    twentyDownTarget: round2(twentyDownTarget),
    fourYearMaxLoan: round2(maxLoan),
    tenPercentBudget: round2(tenPercentBudget),
    maxMonthlyLoanPayment: round2(maxLoanPmt),
    maxCarPrice: round2(maxCarPrice),
    monthlyTCO: round2(tco),
    loanMonthly: round2(loanPmtAtMax),
  };
}

// ---- helpers --------------------------------------------------------------

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
