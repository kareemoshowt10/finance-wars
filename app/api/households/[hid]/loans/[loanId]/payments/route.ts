import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { applyLoanPayment } from "@/lib/loans";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { hid: string; loanId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const loan = await prisma.loan.findUnique({ where: { id: params.loanId } });
  if (!loan || loan.householdId !== params.hid) return bad("Not found", 404);
  if (loan.status !== "ACTIVE") return bad("Loan is not active");

  const parsed = paymentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const { newBalance, overpaid, paidOff } = applyLoanPayment(loan.balanceRemaining, parsed.data.amount);

  const [payment] = await prisma.$transaction([
    prisma.loanPayment.create({
      data: { loanId: loan.id, amount: parsed.data.amount, note: parsed.data.note },
    }),
    prisma.loan.update({
      where: { id: loan.id },
      data: { balanceRemaining: newBalance, status: paidOff ? "PAID" : "ACTIVE" },
    }),
  ]);

  await log(r.user.id, "pay", { entity: "Loan", entityId: loan.id, meta: { amount: parsed.data.amount }, req });

  if (paidOff) {
    await Promise.all([
      evaluate(loan.borrowerUserId, { type: "household-loan-paid-off" }),
      prisma.notification.create({
        data: {
          userId: loan.lenderUserId,
          kind: "LOAN",
          title: `🏦 Loan for "${loan.purpose}" paid off`,
          body: "Balance is $0 — clean slate.",
          link: "/dashboard/household/bank",
        },
      }).catch(() => null),
    ]);
  }

  return ok({ payment, newBalance, overpaid, paidOff });
}
