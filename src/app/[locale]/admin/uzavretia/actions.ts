"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { closures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { bratislavaLocalToUtc } from "@/lib/format";

export async function addClosure(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const rangeId = (formData.get("rangeId") as string) || null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const startTime = (formData.get("startTime") as string)?.trim() || "00:00";
  const endTime = (formData.get("endTime") as string)?.trim() || "23:59";
  const reasonSk = (formData.get("reasonSk") as string) || null;
  const reasonHu = (formData.get("reasonHu") as string) || null;

  if (!startDate || !endDate) {
    return { error: t("startEndRequired") };
  }

  await db.insert(closures).values({
    rangeId,
    startsAt: bratislavaLocalToUtc(startDate, startTime),
    endsAt: bratislavaLocalToUtc(endDate, endTime),
    reasonSk,
    reasonHu,
    createdBy: session.user.id,
  });

  revalidatePath("/admin/uzavretia");
  return { success: true };
}

export async function updateClosure(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const id = formData.get("id") as string;
  const rangeId = (formData.get("rangeId") as string) || null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const startTime = (formData.get("startTime") as string)?.trim() || "00:00";
  const endTime = (formData.get("endTime") as string)?.trim() || "23:59";
  const reasonSk = (formData.get("reasonSk") as string) || null;
  const reasonHu = (formData.get("reasonHu") as string) || null;

  if (!id || !startDate || !endDate) {
    return { error: t("requiredFieldsMissing") };
  }

  await db
    .update(closures)
    .set({
      rangeId,
      startsAt: bratislavaLocalToUtc(startDate, startTime),
      endsAt: bratislavaLocalToUtc(endDate, endTime),
      reasonSk,
      reasonHu,
    })
    .where(eq(closures.id, id));

  revalidatePath("/admin/uzavretia");
  return { success: true };
}

export async function deleteClosure(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(closures).where(eq(closures.id, id));
  revalidatePath("/admin/uzavretia");
}
