import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { accrueLoanById } from "@/lib/loanAccrual";
import { summarizeBankPosition } from "@/lib/loans";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  borrowerUserId: z.string().min(1),
  principal: z.coerce.number().positive(),
  purpose: z.string().min(1).max(200),
  category: z.enum(["ESSENTIAL", "ELECTIVE"]).default("ELECTIVE"),
  interestRateApr: z.coerce.number().min(0).max(100).default(0),
  dueDate: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { hid: string } },
) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  let loans = await prisma.loan.findMany({
    where: { householdId: params.hid },
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      lender: { select: { id: true, name: true } },
      borrower: { select: { id: true, name: true } },
    },
  });

  // Lazily bring interest current on read — same pattern as personal debt accounts.
  const stale = loans.filter(
    (l) => l.status === "ACTIVE" && l.interestRateApr > 0,
  );
  if (stale.length) {
    await Promise.all(stale.map((l) => accrueLoanById(l.id).catch(() => null)));
    loans = await prisma.loan.findMany({
      where: { householdId: params.hid },
      orderBy: { createdAt: "desc" },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
        lender: { select: { id: true, name: true } },
        borrower: { select: { id: true, name: true } },
      },
    });
  }

  const bankPosition = summarizeBankPosition(loans);

  return ok({ loans, bankPosition });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { hid: string } },
) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  if (parsed.data.borrowerUserId === r.user.id)
    return bad("You can't lend to yourself");

  const members = await getHouseholdMembers(params.hid);
  const borrowerIsMember = members.some(
    (m) => m.userId === parsed.data.borrowerUserId,
  );
  if (!borrowerIsMember) return bad("Borrower must be a household member");

  let dueDate: Date | undefined;
  if (parsed.data.dueDate) {
    dueDate = new Date(parsed.data.dueDate);
    if (isNaN(dueDate.getTime())) return bad("Invalid due date");
  }

  const loan = await prisma.loan.create({
    data: {
      householdId: params.hid,
      lenderUserId: r.user.id,
      borrowerUserId: parsed.data.borrowerUserId,
      principal: parsed.data.principal,
      balanceRemaining: parsed.data.principal,
      interestRateApr: parsed.data.interestRateApr,
      purpose: parsed.data.purpose,
      category: parsed.data.category,
      dueDate,
    },
  });

  await Promise.all([
    log(r.user.id, "create", { entity: "Loan", entityId: loan.id, req }),
    evaluate(r.user.id, { type: "household-loan-created" }),
    prisma.notification
      .create({
        data: {
          userId: parsed.data.borrowerUserId,
          kind: "LOAN",
          title: `🏦 The bank fronted you $${parsed.data.principal.toFixed(2)}`,
          body: `For: ${parsed.data.purpose}${parsed.data.interestRateApr > 0 ? ` · ${parsed.data.interestRateApr}% APR` : ""}`,
          link: "/dashboard/household/bank",
        },
      })
      .catch(() => null),
  ]);

  return ok({ loan });
}
