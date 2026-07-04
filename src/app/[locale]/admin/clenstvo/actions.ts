"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

export async function markMembershipPaid(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("membership.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const userId = formData.get("userId") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const feeAmount = formData.get("feeAmount") as string;
  const paymentMethod = formData.get("paymentMethod") as string;
  const note = (formData.get("note") as string) || null;

  if (!userId || !year || !feeAmount || !paymentMethod) {
    return { error: t("allFieldsRequired") };
  }

  const existing = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.year, year)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(memberships)
      .set({
        feeAmount,
        paidAt: new Date(),
        paymentMethod: paymentMethod as "cash" | "transfer" | "other",
        recordedBy: session.user.id,
        note,
      })
      .where(and(eq(memberships.userId, userId), eq(memberships.year, year)));
  } else {
    await db.insert(memberships).values({
      userId,
      year,
      feeAmount,
      paidAt: new Date(),
      paymentMethod: paymentMethod as "cash" | "transfer" | "other",
      recordedBy: session.user.id,
      note,
    });
  }

  await writeAudit({
    actorUserId: session.user.id,
    action: "mark_membership_paid",
    entityType: "membership",
    entityId: `${userId}:${year}`,
    after: { userId, year, feeAmount, paymentMethod },
  });

  revalidatePath("/admin/clenstvo");
  return { success: true };
}

export async function cancelMembership(userId: string, year: number, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db
    .update(memberships)
    .set({ cancelledAt: new Date(), cancelledReason: reason })
    .where(and(eq(memberships.userId, userId), eq(memberships.year, year)));

  await writeAudit({
    actorUserId: session.user.id,
    action: "cancel_membership",
    entityType: "membership",
    entityId: `${userId}:${year}`,
    after: { reason },
  });

  revalidatePath("/admin/clenstvo");
}
