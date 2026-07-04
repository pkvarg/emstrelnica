import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { PgBoss } from "pg-boss";

export const BOOKING_REQUEST_EXPIRY = "booking.requestExpiry";

export async function registerBookingExpiryHandler(boss: PgBoss) {
  await boss.createQueue(BOOKING_REQUEST_EXPIRY);
  await boss.work<{ bookingId: string }>(BOOKING_REQUEST_EXPIRY, async (jobs) => {
    for (const job of jobs) {
    const { bookingId } = job.data;

    const [booking] = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "requested")))
      .limit(1);

    if (!booking) return;

    await db
      .update(bookings)
      .set({ status: "declined", decisionReason: "Auto-declined: no admin response within 24h" })
      .where(eq(bookings.id, bookingId));
    }
  });
}

export async function scheduleBookingExpiry(
  boss: PgBoss,
  bookingId: string,
) {
  await boss.send(BOOKING_REQUEST_EXPIRY, { bookingId }, {
    startAfter: 24 * 60 * 60,
    singletonKey: `expiry-${bookingId}`,
  });
}
