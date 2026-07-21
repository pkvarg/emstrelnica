/**
 * Race test for the capacity-aware booking guard.
 *
 * Fires N concurrent insertBookingGuarded() calls for the same range/time
 * slot and verifies exactly `capacity` succeed and every other attempt is
 * rejected with a BookingConflictError("slotTaken") — proving the advisory
 * lock + counted-capacity transaction prevents overbooking under concurrency.
 *
 * Also fires one whole-range attempt afterwards and expects it to be
 * rejected (units already taken).
 *
 * Requires a real user row. Pass its UUID via TEST_USER_ID, or the script
 * will pick the first `active` user.
 *
 *   DATABASE_URL=... tsx scripts/load-test-booking-race.ts
 *   RACE_CONCURRENCY=20 RACE_RANGE_ID=r50 tsx scripts/load-test-booking-race.ts
 */

import "dotenv/config";
import { db } from "@/db";
import { bookings, users, ranges } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  insertBookingGuarded,
  BookingConflictError,
} from "@/lib/booking-guard";

const N = parseInt(process.env.RACE_CONCURRENCY || "20", 10);
const RANGE_ID = process.env.RACE_RANGE_ID || "r50";

async function main() {
  const [range] = await db.select().from(ranges).where(eq(ranges.id, RANGE_ID)).limit(1);
  if (!range) throw new Error(`Range ${RANGE_ID} not found (run pnpm seed:emel)`);

  let userId = process.env.TEST_USER_ID;
  if (!userId) {
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "active"))
      .limit(1);
    if (!u) throw new Error("No active user found (seed an admin or pass TEST_USER_ID)");
    userId = u.id;
  }

  // Pick a slot far in the future to avoid colliding with real bookings.
  const startsAt = new Date(Date.UTC(2099, 0, 1, 9, 0, 0));
  const endsAt = new Date(Date.UTC(2099, 0, 1, 10, 0, 0));

  const expected = Math.min(N, range.capacity);
  console.log(
    `[race] firing ${N} concurrent guarded inserts for ${RANGE_ID} ` +
      `(capacity=${range.capacity}) ${startsAt.toISOString()}`,
  );
  console.log(`[race] user=${userId}, expecting exactly ${expected} successes`);

  const cleanup = () =>
    db
      .delete(bookings)
      .where(and(eq(bookings.rangeId, RANGE_ID), eq(bookings.startsAt, startsAt)));

  // Clean any leftover from a previous run.
  await cleanup();

  const results = await Promise.allSettled(
    Array.from({ length: N }, () =>
      insertBookingGuarded({
        userId: userId!,
        rangeId: RANGE_ID,
        startsAt,
        endsAt,
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const capacityRejected = results.filter(
    (r) =>
      r.status === "rejected" &&
      r.reason instanceof BookingConflictError &&
      r.reason.code === "slotTaken",
  ).length;
  const otherRejected = results.length - succeeded - capacityRejected;

  console.log(
    `[race] succeeded=${succeeded} capacity-rejected=${capacityRejected} other-errors=${otherRejected}`,
  );

  let wholeRangeOk = true;
  if (range.allowWholeRange && succeeded > 0) {
    // A whole-range rental must now be impossible for the same window.
    try {
      await insertBookingGuarded({
        userId: userId!,
        rangeId: RANGE_ID,
        startsAt,
        endsAt,
        wholeRange: true,
      });
      wholeRangeOk = false;
      console.error("[race] FAIL: whole-range booking succeeded on a partially-booked slot");
    } catch (e) {
      if (e instanceof BookingConflictError && e.code === "slotTaken") {
        console.log("[race] whole-range attempt correctly rejected");
      } else {
        wholeRangeOk = false;
        console.error("[race] unexpected whole-range error:", e);
      }
    }
  }

  await cleanup();

  if (otherRejected > 0) {
    console.error("[race] unexpected errors:");
    for (const r of results) {
      if (
        r.status === "rejected" &&
        !(r.reason instanceof BookingConflictError && r.reason.code === "slotTaken")
      ) {
        console.error("  -", r.reason);
      }
    }
    process.exit(2);
  }
  if (succeeded !== expected || !wholeRangeOk) {
    console.error(`[race] FAIL: expected exactly ${expected} successes, got ${succeeded}`);
    process.exit(1);
  }

  console.log("[race] OK — capacity guard holds under concurrency");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
