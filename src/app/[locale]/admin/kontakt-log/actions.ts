"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactBans } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

type BanKind = "email" | "ip";
type Result = { error?: string; success?: boolean };

function normalize(kind: BanKind, raw: string): string {
  return kind === "email" ? raw.trim().toLowerCase() : raw.trim();
}

export async function banContact(
  kind: BanKind,
  value: string,
  reason: string | null,
): Promise<Result> {
  const t = await getTranslations("contactLog.ban");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const normalized = normalize(kind, value);
  if (!normalized) return { error: t("invalidValue") };

  const [existing] = await db
    .select({ id: contactBans.id })
    .from(contactBans)
    .where(and(eq(contactBans.kind, kind), eq(contactBans.value, normalized)))
    .limit(1);

  if (existing) {
    return { error: t("alreadyBanned") };
  }

  await db.insert(contactBans).values({
    kind,
    value: normalized,
    reason: reason?.trim() || null,
    bannedBy: session.user.id,
  });

  await writeAudit({
    actorUserId: session.user.id,
    action: "contact_ban",
    entityType: "contact_ban",
    entityId: `${kind}:${normalized}`,
    after: { kind, value: normalized, reason: reason ?? null },
  });

  revalidatePath("/admin/kontakt-log");
  return { success: true };
}

export async function unbanContact(kind: BanKind, value: string): Promise<Result> {
  const t = await getTranslations("contactLog.ban");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const normalized = normalize(kind, value);
  await db
    .delete(contactBans)
    .where(and(eq(contactBans.kind, kind), eq(contactBans.value, normalized)));

  await writeAudit({
    actorUserId: session.user.id,
    action: "contact_unban",
    entityType: "contact_ban",
    entityId: `${kind}:${normalized}`,
  });

  revalidatePath("/admin/kontakt-log");
  return { success: true };
}
