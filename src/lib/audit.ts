import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getClientIp } from "@/lib/ip";
import { headers } from "next/headers";

interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function writeAudit(entry: AuditEntry) {
  const hdrs = await headers();
  const ip = await getClientIp();
  const userAgent = hdrs.get("user-agent") ?? null;

  await db.insert(auditLog).values({
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeJsonb: entry.before ?? null,
    afterJsonb: entry.after ?? null,
    ip,
    userAgent,
  });
}
