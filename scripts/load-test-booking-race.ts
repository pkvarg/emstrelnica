/**
 * Race test for the bookings exclusion constraint.
 *
 * Fires N concurrent inserts for the same range/time slot and verifies
 * exactly one succeeds — proving `bookings_no_overlap` holds under concurrency.
 *
 * Requires a real user row. Pass its UUID via TEST_USER_ID, or the script
 * will pick the first `active` user.
 *
 *   DATABASE_URL=... tsx scripts/load-test-booking-race.ts
 */

import "dotenv/config";
import { db } from "@/db";
import { bookings, users, ranges } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

const N = parseInt(process.env.RACE_CONCURRENCY || "20", 10);
const RANGE_ID = process.env.RACE_RANGE_ID || "R50";

async function main() {
  const [range] = await db.select().from(ranges).where(eq(ranges.id, RANGE_ID)).limit(1);
  if (!range) throw new Error(`Range ${RANGE_ID} not found`);

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

  console.log(`[race] firing ${N} concurrent inserts for ${RANGE_ID} ${startsAt.toISOString()}`);
  console.log(`[race] user=${userId}`);

  // Clean any leftover from a previous run.
  await db
    .delete(bookings)
    .where(and(eq(bookings.rangeId, RANGE_ID), eq(bookings.startsAt, startsAt)));

  const results = await Promise.allSettled(
    Array.from({ length: N }, () =>
      db.insert(bookings).values({
        userId,
        rangeId: RANGE_ID,
        startsAt,
        endsAt,
        rulesConsentVersionAtBooking: "v1",
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const overlapRejected = results.filter(
    (r) => r.status === "rejected" && /bookings_no_overlap/.test(String((r as PromiseRejectedResult).reason)),
  ).length;
  const otherRejected = results.length - succeeded - overlapRejected;

  console.log(`[race] succeeded=${succeeded} overlap-rejected=${overlapRejected} other-errors=${otherRejected}`);

  // Cleanup the one that did succeed.
  await db
    .delete(bookings)
    .where(and(eq(bookings.rangeId, RANGE_ID), eq(bookings.startsAt, startsAt)));

  if (otherRejected > 0) {
    console.error("[race] unexpected errors:");
    for (const r of results) {
      if (r.status === "rejected" && !/bookings_no_overlap/.test(String(r.reason))) {
        console.error("  -", r.reason);
      }
    }
    process.exit(2);
  }
  if (succeeded !== 1) {
    console.error(`[race] FAIL: expected exactly 1 success, got ${succeeded}`);
    process.exit(1);
  }

  console.log("[race] OK — exclusion constraint holds under concurrency");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
