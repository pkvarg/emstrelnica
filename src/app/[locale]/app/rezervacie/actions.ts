"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isWithinOpeningHours, isClosedDuring } from "@/lib/availability";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getPgBoss } from "@/lib/pgboss";
import { scheduleBookingExpiry } from "@/lib/jobs/booking-expiry";
import { scheduleBookingReminder } from "@/lib/jobs/booking-reminder";
import { scheduleNoShowSweep } from "@/lib/jobs/booking-noshow";
import { scheduleAutoComplete } from "@/lib/jobs/booking-autocomplete";
import { issueApprovalTokens } from "@/lib/approval-tokens";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyAdminsBookingRequest,
  notifyMemberBookingApproved,
  notifyMemberBookingCancelled,
} from "@/lib/notify";
import {
  getBookingRequestsExtraRecipients,
  isAutopilotEnabled,
} from "@/lib/settings";
import { fmtDate, fmtTime, bratislavaLocalToUtc } from "@/lib/format";

interface BookingResult {
  error?: string;
  success?: boolean;
}

export async function requestBooking(
  _prev: BookingResult | null,
  formData: FormData,
): Promise<BookingResult> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const { allowed } = rateLimit(`booking:${session.user.id}`, 5, 60 * 1000);
  if (!allowed) return { error: "Too many requests" };

  const rangeId = formData.get("rangeId") as string;
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const hours = parseInt(formData.get("hours") as string, 10) || 1;
  const guestCount = parseInt(formData.get("guestCount") as string, 10) || 0;
  const userNote = (formData.get("userNote") as string) || null;

  if (!rangeId || !date || !startTime) {
    return { error: "All fields are required" };
  }

  if (!/^\d{2}:00$/.test(startTime)) {
    return { error: "Start time must be a whole hour" };
  }

  const startsAt = bratislavaLocalToUtc(date, startTime);
  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);

  if (startsAt <= new Date()) {
    return { error: "pastDate" };
  }

  const withinHours = await isWithinOpeningHours(rangeId, startsAt, endsAt);
  if (!withinHours) {
    return { error: "outsideHours" };
  }

  const closed = await isClosedDuring(rangeId, startsAt, endsAt);
  if (closed) {
    return { error: "closedRange" };
  }

  try {
    const autopilot = await isAutopilotEnabled();

    const [booking] = await db
      .insert(bookings)
      .values({
        userId: session.user.id,
        rangeId,
        startsAt,
        endsAt,
        guestCount,
        userNote,
        rulesConsentVersionAtBooking: "v1",
        ...(autopilot
          ? {
              status: "approved" as const,
              decidedAt: new Date(),
              decisionReason: "autopilot",
            }
          : {}),
      })
      .returning({ id: bookings.id });

    await writeAudit({
      actorUserId: session.user.id,
      action: autopilot ? "autopilot_approve_booking" : "request_booking",
      entityType: "booking",
      entityId: booking.id,
      after: {
        rangeId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        autopilot,
      },
    });

    try {
      const boss = getPgBoss();
      if (autopilot) {
        await scheduleBookingReminder(boss, booking.id, startsAt);
        await scheduleNoShowSweep(boss, booking.id, startsAt);
        await scheduleAutoComplete(boss, booking.id, endsAt);
      } else {
        await scheduleBookingExpiry(boss, booking.id);
      }
    } catch {
      // pg-boss may not be started yet in dev; booking still created
    }

    const adminTokens = autopilot ? [] : await issueApprovalTokens(booking.id);

    try {
      const [member] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          locale: users.locale,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      const adminRows = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName })
        .from(users)
        .where(
          and(
            eq(users.role, "admin"),
            eq(users.status, "active"),
            eq(users.receivesBookingRequests, true),
          ),
        );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const locale = member?.locale || "sk";

      const admins = adminRows.map((a) => {
        if (autopilot) {
          return { email: a.email, firstName: a.firstName, approveUrl: "", declineUrl: "" };
        }
        const approveToken = adminTokens.find(
          (t) => t.adminUserId === a.id && t.action === "approve",
        )?.token;
        const declineToken = adminTokens.find(
          (t) => t.adminUserId === a.id && t.action === "decline",
        )?.token;
        return {
          email: a.email,
          firstName: a.firstName,
          approveUrl: `${appUrl}/${locale}/admin-decide/${approveToken}`,
          declineUrl: `${appUrl}/${locale}/admin-decide/${declineToken}`,
        };
      });

      const adminEmails = new Set(
        adminRows.map((a) => a.email.toLowerCase()),
      );
      const infoOnlyEmails = (await getBookingRequestsExtraRecipients()).filter(
        (e) => !adminEmails.has(e.toLowerCase()),
      );

      await notifyAdminsBookingRequest({
        memberName: member ? `${member.firstName} ${member.lastName}` : "—",
        memberEmail: member?.email || "",
        rangeId,
        date: fmtDate(startsAt),
        time: fmtTime(startsAt),
        hours,
        guestCount,
        note: userNote,
        admins,
        infoOnlyEmails,
        autopilot,
        locale,
        bookingId: booking.id,
      }).catch(console.error);

      if (autopilot && member?.email) {
        await notifyMemberBookingApproved({
          email: member.email,
          memberName: `${member.firstName} ${member.lastName}`.trim(),
          rangeId,
          date: fmtDate(startsAt),
          time: fmtTime(startsAt),
          locale,
          bookingId: booking.id,
          userId: session.user.id,
          autoApproved: true,
        }).catch(console.error);
      }
    } catch (e) {
      console.error("[requestBooking] admin notify failed:", e);
    }

    revalidatePath("/app/rezervacie");
    return { success: true };
  } catch (e: unknown) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("bookings_no_overlap")) {
      return { error: "slotTaken" };
    }
    throw e;
  }
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { allowed } = rateLimit(`cancel:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!allowed) throw new Error("Too many requests");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.userId, session.user.id)),
    )
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (booking.startsAt <= new Date()) throw new Error("Cannot cancel past booking");
  if (!["requested", "approved"].includes(booking.status)) {
    throw new Error("Cannot cancel this booking");
  }

  const cancellationReason = reason?.trim().slice(0, 500) || null;
  const cancelledAt = new Date();

  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancellationReason,
      cancelledBy: "member",
      cancelledAt,
    })
    .where(eq(bookings.id, bookingId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "cancel_booking",
    entityType: "booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: "cancelled", cancellationReason, cancelledBy: "member" },
  });

  try {
    const [member] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (member) {
      await notifyMemberBookingCancelled({
        email: member.email,
        memberName: `${member.firstName} ${member.lastName}`,
        rangeId: booking.rangeId,
        date: fmtDate(booking.startsAt),
        time: fmtTime(booking.startsAt),
        cancelledBy: "member",
        reason: cancellationReason,
        locale: member.locale,
        bookingId,
        userId: session.user.id,
      }).catch(console.error);
    }
  } catch (e) {
    console.error("[cancelBooking] notify failed:", e);
  }

  revalidatePath("/app/rezervacie");
}
