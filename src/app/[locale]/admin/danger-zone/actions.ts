"use server";

import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { getTranslations } from "next-intl/server";

const COOKIE_NAME = "dz_unlock";
const TTL_SECONDS = 15 * 60;

function sign(exp: number, userId: string): string {
  const secret = process.env.AUTH_SECRET || "";
  return crypto
    .createHmac("sha256", secret)
    .update(`${exp}:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function isDangerZoneUnlocked(userId: string): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  return sig === sign(exp, userId);
}

interface UnlockState {
  error?: string;
  success?: boolean;
}

export async function unlockDangerZone(
  _prev: UnlockState | null,
  formData: FormData,
): Promise<UnlockState> {
  const t = await getTranslations("dangerZone");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const expected = process.env.DANGER_ZONE_PASSWORD;
  if (!expected) return { error: t("notConfigured") };

  const password = String(formData.get("password") ?? "");
  if (password !== expected) return { error: t("wrongPassword") };

  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = sign(exp, session.user.id);
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${exp}.${sig}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });

  await writeAudit({
    actorUserId: session.user.id,
    action: "danger_zone_unlock",
    entityType: "system",
    entityId: "danger_zone",
  });

  return { success: true };
}

export async function lockDangerZone() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  revalidatePath("/admin/danger-zone");
}

// Tables safe to TRUNCATE individually. `users` handled specially (preserves current admin).
const TRUNCATABLE = new Set([
  "bookings",
  "audit_log",
  "notifications_log",
  "bot_log",
  "contact_messages",
  "admin_approval_tokens",
  "verification_codes",
  "memberships",
  "closures",
  "opening_hours_templates",
]);

async function assertUnlockedAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  if (!(await isDangerZoneUnlocked(session.user.id))) {
    throw new Error("Danger zone locked");
  }
  return session.user;
}

export async function truncateTableAction(tableName: string) {
  const t = await getTranslations("dangerZone.errors");
  const user = await assertUnlockedAdmin();
  if (!TRUNCATABLE.has(tableName)) throw new Error(t("tableNotAllowed"));

  await db.execute(
    sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`),
  );

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_truncate",
    entityType: "table",
    entityId: tableName,
  });

  revalidatePath("/admin/danger-zone");
}

export async function deleteBookingHardAction(bookingId: string) {
  const user = await assertUnlockedAdmin();

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM notifications_log WHERE booking_id = ${bookingId}`);
    // admin_approval_tokens cascades on booking delete
    await tx.execute(sql`DELETE FROM bookings WHERE id = ${bookingId}`);
  });

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_delete_booking",
    entityType: "booking",
    entityId: bookingId,
  });

  revalidatePath("/admin/danger-zone");
}

export async function deleteUserHardAction(userId: string) {
  const t = await getTranslations("dangerZone.errors");
  const user = await assertUnlockedAdmin();
  if (userId === user.id) throw new Error(t("cannotDeleteSelf"));

  await db.transaction(async (tx) => {
    // Break incoming FK refs before removing the user row.
    await tx.execute(
      sql`DELETE FROM notifications_log WHERE user_id = ${userId} OR booking_id IN (SELECT id FROM bookings WHERE user_id = ${userId})`,
    );
    await tx.execute(
      sql`DELETE FROM admin_approval_tokens WHERE admin_user_id = ${userId} OR booking_id IN (SELECT id FROM bookings WHERE user_id = ${userId})`,
    );
    await tx.execute(
      sql`DELETE FROM bookings WHERE user_id = ${userId} OR decided_by = ${userId}`,
    );
    await tx.execute(sql`DELETE FROM memberships WHERE user_id = ${userId}`);
    await tx.execute(sql`UPDATE memberships SET recorded_by = NULL WHERE recorded_by = ${userId}`);
    await tx.execute(sql`UPDATE audit_log SET actor_user_id = NULL WHERE actor_user_id = ${userId}`);
    await tx.execute(sql`UPDATE contact_messages SET handled_by = NULL WHERE handled_by = ${userId}`);
    await tx.execute(sql`DELETE FROM verification_codes WHERE user_id = ${userId}`);
    // Admin-authored seeds (closures.created_by, opening_hours_templates.created_by,
    // consent_documents.published_by) are NOT NULL; since only admins can author those
    // and we only allow deleting non-admins here, these shouldn't match. If they do,
    // the transaction fails loudly so we notice.
    await tx.execute(
      sql`DELETE FROM users WHERE id = ${userId} AND role <> 'admin'`,
    );
  });

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_delete_user",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/danger-zone");
}

export async function setAdminStatusAction(
  userId: string,
  nextStatus: "active" | "suspended",
) {
  const t = await getTranslations("dangerZone.errors");
  const user = await assertUnlockedAdmin();
  if (userId === user.id) throw new Error(t("cannotChangeSelf"));

  const [row] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw new Error(t("adminNotFound"));
  if (row.role !== "admin") throw new Error(t("targetNotAdmin"));

  await db
    .update(users)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_admin_status",
    entityType: "user",
    entityId: userId,
    before: { status: row.status },
    after: { status: nextStatus },
  });

  revalidatePath("/admin/danger-zone");
}

export async function clearPgBossAction() {
  const user = await assertUnlockedAdmin();
  const schema = process.env.PGBOSS_SCHEMA || "pgboss";

  await db.execute(sql.raw(`TRUNCATE TABLE "${schema}"."job" RESTART IDENTITY CASCADE`));
  await db.execute(sql.raw(`TRUNCATE TABLE "${schema}"."schedule" RESTART IDENTITY CASCADE`));

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_truncate",
    entityType: "pgboss",
    entityId: schema,
  });

  revalidatePath("/admin/danger-zone");
}

export async function nukeEverythingAction() {
  const user = await assertUnlockedAdmin();

  const list = Array.from(TRUNCATABLE)
    .map((t) => `"${t}"`)
    .join(", ");
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`),
  );

  await db.execute(
    sql`DELETE FROM users WHERE role <> 'admin' AND id <> ${user.id}`,
  );

  const schema = process.env.PGBOSS_SCHEMA || "pgboss";
  await db.execute(sql.raw(`TRUNCATE TABLE "${schema}"."job" RESTART IDENTITY CASCADE`));
  await db.execute(sql.raw(`TRUNCATE TABLE "${schema}"."schedule" RESTART IDENTITY CASCADE`));

  await writeAudit({
    actorUserId: user.id,
    action: "danger_zone_nuke",
    entityType: "system",
    entityId: "all",
  });

  revalidatePath("/admin/danger-zone");
}
