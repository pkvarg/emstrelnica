import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { PgBoss } from "pg-boss";

export const BOOKING_AUTO_COMPLETE = "booking.autoComplete";

export async function registerAutoCompleteHandler(boss: PgBoss) {
  await boss.createQueue(BOOKING_AUTO_COMPLETE);
  await boss.work<{ bookingId: string }>(BOOKING_AUTO_COMPLETE, async (jobs) => {
    for (const job of jobs) {
      const { bookingId } = job.data;

      const [booking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, bookingId),
            inArray(bookings.status, ["approved", "checked_in"]),
          ),
        )
        .limit(1);

      if (!booking) continue;

      const effectiveMinutes = Math.round(
        (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000,
      );

      await db
        .update(bookings)
        .set({
          status: "completed",
          autoCompletedAt: new Date(),
          effectiveMinutes,
        })
        .where(eq(bookings.id, bookingId));
    }
  });
}

export async function scheduleAutoComplete(boss: PgBoss, bookingId: string, endsAt: Date) {
  const delaySeconds = Math.floor((endsAt.getTime() - Date.now()) / 1000);
  if (delaySeconds <= 0) return;

  await boss.send(BOOKING_AUTO_COMPLETE, { bookingId }, {
    startAfter: delaySeconds,
    singletonKey: `complete-${bookingId}`,
  });
}
