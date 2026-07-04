import { db } from "@/db";
import { contactMessages, notificationsLog, auditLog, users, bookings } from "@/db/schema";
import { lt, eq, and, isNotNull } from "drizzle-orm";
import type { PgBoss } from "pg-boss";

export const RETENTION_SWEEP = "retention.sweep";

export async function registerRetentionSweepHandler(boss: PgBoss) {
  await boss.createQueue(RETENTION_SWEEP);
  await boss.work(RETENTION_SWEEP, async () => {
    const now = new Date();

    // Contact messages: 1 year
    const contactCutoff = new Date(now);
    contactCutoff.setFullYear(contactCutoff.getFullYear() - 1);
    const deletedContacts = await db
      .delete(contactMessages)
      .where(lt(contactMessages.createdAt, contactCutoff));
    console.log("[retention] Deleted old contact messages");

    // Notification logs: 12 months
    const notifCutoff = new Date(now);
    notifCutoff.setFullYear(notifCutoff.getFullYear() - 1);
    const deletedNotifs = await db
      .delete(notificationsLog)
      .where(lt(notificationsLog.sentAt, notifCutoff));
    console.log("[retention] Deleted old notification logs");

    // Audit log IP/user-agent: 6 months (null out, keep entry for 3 years)
    const ipCutoff = new Date(now);
    ipCutoff.setMonth(ipCutoff.getMonth() - 6);
    await db
      .update(auditLog)
      .set({ ip: null, userAgent: null })
      .where(and(lt(auditLog.createdAt, ipCutoff), isNotNull(auditLog.ip)));
    console.log("[retention] Scrubbed IP/UA from old audit entries");

    // Audit log entries: 3 years
    const auditCutoff = new Date(now);
    auditCutoff.setFullYear(auditCutoff.getFullYear() - 3);
    await db
      .delete(auditLog)
      .where(lt(auditLog.createdAt, auditCutoff));
    console.log("[retention] Deleted audit entries older than 3 years");

    // Anonymize inactive users: membership ended + 3 years, no recent bookings
    // This is a complex check — for now, log a placeholder
    console.log("[retention] User anonymization check would run here (requires lawyer-approved logic)");
  });
}

export async function scheduleRetentionSweep(boss: PgBoss) {
  await boss.schedule(RETENTION_SWEEP, "0 4 * * *", {}, {});
}
