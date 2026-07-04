"use server";

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { getTranslations } from "next-intl/server";

interface Result {
  error?: string;
  success?: boolean;
}

export async function confirmCheckIn(
  token: string,
  _prev: Result | null,
): Promise<Result> {
  const t = await getTranslations("checkIn");
  const ip = (await getClientIp()) ?? "unknown";
  const { allowed } = rateLimit(`checkin:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) return { error: t("tooManyAttempts") };

  const bookingId = verifyCheckInToken(token);
  if (!bookingId) return { error: t("invalidLink") };

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "approved")))
    .limit(1);

  if (!booking) return { error: t("notApprovable") };

  await db
    .update(bookings)
    .set({ status: "checked_in", checkInAt: new Date() })
    .where(eq(bookings.id, bookingId));

  await writeAudit({
    actorUserId: booking.userId,
    action: "check_in",
    entityType: "booking",
    entityId: bookingId,
    before: { status: "approved" },
    after: { status: "checked_in", ip },
  });

  return { success: true };
}
