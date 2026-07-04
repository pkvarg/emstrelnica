"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { openingHoursTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

export async function addOpeningHours(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const rangeId = formData.get("rangeId") as string;
  const weekdays = formData.getAll("weekdays").map((v) => parseInt(v as string, 10));
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const validFrom = formData.get("validFrom") as string;
  const validTo = (formData.get("validTo") as string) || null;

  if (!rangeId || weekdays.length === 0 || !startTime || !endTime || !validFrom) {
    return { error: t("allFieldsRequired") };
  }

  if (weekdays.some((d) => isNaN(d) || d < 0 || d > 6)) {
    return { error: t("invalidWeekday") };
  }

  await db.insert(openingHoursTemplates).values(
    weekdays.map((weekday) => ({
      rangeId,
      weekday,
      startTime,
      endTime,
      validFrom,
      validTo,
      createdBy: session.user.id,
    })),
  );

  revalidatePath("/admin/otvaracie-hodiny");
  return { success: true };
}

export async function updateOpeningHours(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const id = formData.get("id") as string;
  const weekdayRaw = formData.get("weekday") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const validFrom = formData.get("validFrom") as string;
  const validTo = (formData.get("validTo") as string) || null;

  if (!id || !weekdayRaw || !startTime || !endTime || !validFrom) {
    return { error: t("allFieldsRequired") };
  }

  const weekday = parseInt(weekdayRaw, 10);
  if (isNaN(weekday) || weekday < 0 || weekday > 6) {
    return { error: t("invalidWeekday") };
  }

  await db
    .update(openingHoursTemplates)
    .set({ weekday, startTime, endTime, validFrom, validTo })
    .where(eq(openingHoursTemplates.id, id));

  revalidatePath("/admin/otvaracie-hodiny");
  return { success: true };
}

export async function deleteOpeningHours(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db
    .delete(openingHoursTemplates)
    .where(eq(openingHoursTemplates.id, id));

  revalidatePath("/admin/otvaracie-hodiny");
}
