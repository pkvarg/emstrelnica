"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { adminApprovalTokens } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { notifyMemberBookingApproved, notifyMemberBookingDeclined } from "@/lib/notify";
import { fmtDate, fmtTime } from "@/lib/format";
import { getPgBoss } from "@/lib/pgboss";
import { scheduleBookingReminder } from "@/lib/jobs/booking-reminder";
import { scheduleNoShowSweep } from "@/lib/jobs/booking-noshow";
import { scheduleAutoComplete } from "@/lib/jobs/booking-autocomplete";

async function decideBookingInline(
  bookingId: string,
  newStatus: "approved" | "declined",
  reason?: string,
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const [booking] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "requested") throw new Error("Booking not in requested state");

  await db
    .update(bookings)
    .set({
      status: newStatus,
      decidedBy: session.user.id,
      decidedAt: new Date(),
      decisionReason: reason ?? null,
    })
    .where(eq(bookings.id, bookingId));

  // Invalidate all approval tokens for this booking
  const tokens = await db
    .select({ id: adminApprovalTokens.id })
    .from(adminApprovalTokens)
    .where(eq(adminApprovalTokens.bookingId, bookingId));

  for (const t of tokens) {
    await db
      .update(adminApprovalTokens)
      .set({ usedAt: new Date(), usedIp: "inline-dashboard" })
      .where(eq(adminApprovalTokens.id, t.id));
  }

  await writeAudit({
    actorUserId: session.user.id,
    action: `booking_${newStatus}`,
    entityType: "booking",
    entityId: bookingId,
    before: { status: "requested" },
    after: { status: newStatus, reason },
  });

  await notifyMemberAfterInlineDecision(bookingId, newStatus, reason ?? null).catch(console.error);

  revalidatePath("/admin");
}

async function notifyMemberAfterInlineDecision(
  bookingId: string,
  newStatus: "approved" | "declined",
  reason: string | null,
) {
  const [row] = await db
    .select({
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      userId: bookings.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      locale: users.locale,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return;

  const common = {
    email: row.email,
    memberName: `${row.firstName} ${row.lastName}`,
    rangeId: row.rangeId,
    date: fmtDate(row.startsAt),
    time: fmtTime(row.startsAt),
    locale: row.locale,
    bookingId,
    userId: row.userId,
  };

  if (newStatus === "approved") {
    await notifyMemberBookingApproved(common);
    try {
      const boss = getPgBoss();
      await scheduleBookingReminder(boss, bookingId, row.startsAt);
      await scheduleNoShowSweep(boss, bookingId, row.startsAt);
      await scheduleAutoComplete(boss, bookingId, row.endsAt);
    } catch (e) {
      console.error("[inline decide] pg-boss scheduling failed:", e);
    }
  } else {
    await notifyMemberBookingDeclined({ ...common, reason });
  }
}

export async function approveBookingInline(bookingId: string) {
  await decideBookingInline(bookingId, "approved");
}

export async function declineBookingInline(bookingId: string, reason?: string) {
  await decideBookingInline(bookingId, "declined", reason);
}

export async function checkInBookingAdmin(bookingId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const [booking] = await db
    .select({ id: bookings.id, status: bookings.status, userId: bookings.userId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "approved") throw new Error("Booking not in approved state");

  await db
    .update(bookings)
    .set({ status: "checked_in", checkInAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "admin_check_in",
    entityType: "booking",
    entityId: bookingId,
    before: { status: "approved" },
    after: { status: "checked_in" },
  });

  revalidatePath("/admin");
}
