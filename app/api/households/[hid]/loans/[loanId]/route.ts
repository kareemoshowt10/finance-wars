import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { accrueLoanById } from "@/lib/loanAccrual";
import { loanProgress } from "@/lib/loans";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { hid: string; loanId: string } },
) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  let loan = await prisma.loan.findUnique({
    where: { id: params.loanId },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      lender: { select: { id: true, name: true } },
      borrower: { select: { id: true, name: true } },
    },
  });
  if (!loan || loan.householdId !== params.hid) return bad("Not found", 404);

  if (loan.status === "ACTIVE" && loan.interestRateApr > 0) {
    const updated = await accrueLoanById(loan.id);
    if (updated) {
      loan = await prisma.loan.findUnique({
        where: { id: params.loanId },
        include: {
          payments: { orderBy: { createdAt: "desc" } },
          lender: { select: { id: true, name: true } },
          borrower: { select: { id: true, name: true } },
        },
      });
    }
  }

  return ok({
    loan,
    progressPct: loan ? loanProgress(loan.principal, loan.balanceRemaining) : 0,
  });
}
