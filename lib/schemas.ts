import { z } from "zod";

export const emailSchema = z.string().email().max(200).transform((s) => s.toLowerCase());
export const passwordSchema = z.string().min(6).max(200);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(80),
});

export const accountSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["checking", "savings", "credit", "investment"]),
  balance: z.coerce.number().finite().optional().default(0),
});

export const accountPatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.enum(["checking", "savings", "credit", "investment"]).optional(),
  balance: z.coerce.number().finite().optional(),
});

export const txSchema = z.object({
  accountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(80),
  description: z.string().max(200).optional().default(""),
  date: z.string().optional(),
});

export const txPatchSchema = z.object({
  accountId: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).max(80).optional(),
  description: z.string().max(200).optional(),
  date: z.string().optional(),
});

export const txBulkSchema = z.object({
  action: z.enum(["delete", "recategorize", "move"]),
  ids: z.array(z.string().min(1)).min(1).max(500),
  category: z.string().min(1).max(80).optional(),
  accountId: z.string().min(1).optional(),
});

export const budgetSchema = z.object({
  category: z.string().min(1).max(80),
  limit: z.coerce.number().nonnegative(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const budgetPatchSchema = z.object({
  category: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().nonnegative().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const goalSchema = z.object({
  name: z.string().min(1).max(80),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative().optional().default(0),
  deadline: z.string().min(1),
});

export const goalPatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  targetAmount: z.coerce.number().positive().optional(),
  currentAmount: z.coerce.number().nonnegative().optional(),
  deadline: z.string().min(1).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().min(1).max(20),
  icon: z.string().min(1).max(40),
  kind: z.enum(["INCOME", "EXPENSE"]),
});

export const categoryPatchSchema = categorySchema.partial();

const FREQ = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"] as const;
export const recurringSchema = z.object({
  accountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(80),
  description: z.string().max(200).optional().default(""),
  frequency: z.enum(FREQ),
  nextRunDate: z.string().min(1),
});

export const recurringPatchSchema = z.object({
  accountId: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).max(80).optional(),
  description: z.string().max(200).optional(),
  frequency: z.enum(FREQ).optional(),
  nextRunDate: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const userPatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: emailSchema.optional(),
  currency: z.string().min(3).max(5).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  onboarded: z.boolean().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordSchema.optional(),
  notifyOnOpponentContribution: z.boolean().optional(),
  defaultStakeAccountId: z.string().nullable().optional(),
});

export const holdingSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1).max(10).transform((s) => s.toUpperCase()),
  shares: z.coerce.number().positive(),
  costBasis: z.coerce.number().nonnegative(),
});

export const holdingPatchSchema = z.object({
  accountId: z.string().min(1).optional(),
  symbol: z.string().min(1).max(10).transform((s) => s.toUpperCase()).optional(),
  shares: z.coerce.number().positive().optional(),
  costBasis: z.coerce.number().nonnegative().optional(),
});

export const apiTokenSchema = z.object({
  name: z.string().min(1).max(80),
});

export const ruleSchema = z.object({
  name: z.string().min(1).max(80),
  pattern: z.string().min(1).max(120),
  accountId: z.string().min(1).optional().nullable(),
  categoryOut: z.string().min(1).max(80),
  autoTag: z.string().max(40).optional().nullable(),
  priority: z.coerce.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const rulePatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  pattern: z.string().min(1).max(120).optional(),
  accountId: z.string().min(1).nullable().optional(),
  categoryOut: z.string().min(1).max(80).optional(),
  autoTag: z.string().max(40).nullable().optional(),
  priority: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export const goalContributionSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  transactionId: z.string().optional().nullable(),
  note: z.string().max(200).optional().nullable(),
});
