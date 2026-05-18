import { prisma } from "./prisma";
import { getClientIp } from "./ratelimit";

export type AuditOpts = {
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  req?: Request;
};

export async function log(userId: string, action: string, opts: AuditOpts) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: opts.entity,
        entityId: opts.entityId,
        meta: opts.meta as never,
        ip: opts.req ? getClientIp(opts.req) : undefined,
      },
    });
  } catch {
    // swallow audit failures
  }
}
