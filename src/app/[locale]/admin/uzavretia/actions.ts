"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { closures, bookings, users, ranges } from "@/db/schema";
import { eq, and, lt, gt, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { bratislavaLocalToUtc, fmtDate, fmtTime } from "@/lib/format";
import { writeAudit } from "@/lib/audit";
import { notifyMemberBookingCancelled } from "@/lib/notify";

export interface ClosureConflict {
  id: string;
  member: string;
  range: string;
  date: string;
  time: string;
  status: string;
}

export interface AddClosureState {
  error?: string;
  success?: boolean;
  cancelledCount?: number;
  conflicts?: ClosureConflict[];
}

export async function addClosure(
  _prev: AddClosureState | null,
  formData: FormData,
): Promise<AddClosureState> {
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
  const confirmCancel = formData.get("confirmCancel") === "1";

  if (!startDate || !endDate) {
    return { error: t("startEndRequired") };
  }

  const closureStart = bratislavaLocalToUtc(startDate, startTime);
  const closureEnd = bratislavaLocalToUtc(endDate, endTime);
  const now = new Date();

  // Active bookings colliding with the closure window (only ones that can
  // still be cancelled, i.e. not already ended).
  const conflictRows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      rangeId: bookings.rangeId,
      userId: bookings.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      locale: users.locale,
      rangeNameSk: ranges.nameSk,
      rangeNameHu: ranges.nameHu,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(ranges, eq(bookings.rangeId, ranges.id))
    .where(
      and(
        inArray(bookings.status, ["requested", "approved", "checked_in"]),
        lt(bookings.startsAt, closureEnd),
        gt(bookings.endsAt, closureStart),
        gt(bookings.endsAt, now),
        ...(rangeId ? [eq(bookings.rangeId, rangeId)] : []),
      ),
    )
    .orderBy(bookings.startsAt);

  // Conflicts found and not yet confirmed: DON'T create anything — surface
  // the list so the admin explicitly acknowledges the mass cancellation.
  if (conflictRows.length > 0 && !confirmCancel) {
    return {
      conflicts: conflictRows.map((r) => ({
        id: r.id,
        member: `${r.firstName} ${r.lastName}`,
        range: r.rangeNameSk,
        date: fmtDate(r.startsAt),
        time: `${fmtTime(r.startsAt)} – ${fmtTime(r.endsAt)}`,
        status: r.status,
      })),
    };
  }

  await db.insert(closures).values({
    rangeId,
    startsAt: closureStart,
    endsAt: closureEnd,
    reasonSk,
    reasonHu,
    createdBy: session.user.id,
  });

  if (conflictRows.length > 0) {
    const fallbackReason = "Strelnica uzavretá / Lőtér zárva";
    const storedReason = reasonSk || reasonHu || fallbackReason;

    await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledBy: "admin",
        cancellationReason: storedReason,
        cancelledAt: now,
      })
      .where(inArray(bookings.id, conflictRows.map((r) => r.id)));

    await writeAudit({
      actorUserId: session.user.id,
      action: "closure_cancel_bookings",
      entityType: "closure",
      entityId: `${startDate}..${endDate}`,
      before: { activeBookings: conflictRows.map((r) => r.id) },
      after: {
        status: "cancelled",
        reason: storedReason,
        count: conflictRows.length,
      },
    });

    for (const r of conflictRows) {
      const memberReason =
        (r.locale === "hu" ? reasonHu || reasonSk : reasonSk || reasonHu) ||
        fallbackReason;
      await notifyMemberBookingCancelled({
        email: r.email,
        memberName: `${r.firstName} ${r.lastName}`,
        rangeId: r.locale === "hu" ? r.rangeNameHu : r.rangeNameSk,
        date: fmtDate(r.startsAt),
        time: fmtTime(r.startsAt),
        cancelledBy: "admin",
        reason: memberReason,
        locale: r.locale,
        bookingId: r.id,
        userId: r.userId,
      }).catch(console.error);
    }
  }

  revalidatePath("/admin/uzavretia");
  revalidatePath("/admin");
  revalidatePath("/admin/rezervacie");
  return { success: true, cancelledCount: conflictRows.length };
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
