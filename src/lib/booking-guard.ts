import { db } from "@/db";
import { bookings, ranges } from "@/db/schema";
import { and, eq, inArray, lt, gt, sql } from "drizzle-orm";
import { computeBookingPrice } from "@/lib/pricing";

/**
 * Capacity-aware booking insert.
 *
 * The old model relied on a Postgres EXCLUDE constraint ("bookings_no_overlap")
 * that allowed at most ONE active booking per range and time window. A GiST
 * exclusion cannot express "allow up to N overlaps", so migration 0017 drops
 * the constraint and this module becomes the single write path for bookings:
 *
 *   1. take a transaction-scoped advisory lock (serializes booking writes),
 *   2. re-check conflicts inside the transaction:
 *      - a "blocksAll" resource (celý areál) conflicts with ANY active booking,
 *      - any resource conflicts with an active "blocksAll" booking,
 *      - otherwise sum(units) of overlapping active bookings + requested units
 *        must not exceed the range capacity,
 *   3. insert.
 *
 * Always create bookings through insertBookingGuarded() — a plain
 * db.insert(bookings) is no longer protected against overbooking.
 */

export const ACTIVE_BOOKING_STATUSES = [
  "requested",
  "approved",
  "checked_in",
] as const;

/** App-wide advisory lock key for booking writes (arbitrary constant). */
const BOOKING_LOCK_KEY = 728_493_112;

export type BookingConflictCode =
  | "rangeNotFound"
  | "slotTaken"
  | "arealBooked"
  | "groupTooLarge"
  | "wholeRangeNotAllowed";

export class BookingConflictError extends Error {
  constructor(public readonly code: BookingConflictCode) {
    super(code);
    this.name = "BookingConflictError";
  }
}

export interface GuardedBookingInput {
  userId: string;
  rangeId: string;
  startsAt: Date;
  endsAt: Date;
  guestCount?: number;
  userNote?: string | null;
  groupSize?: number;
  wholeRange?: boolean;
  autopilot?: boolean;
  rulesConsentVersion?: string;
}

export interface GuardedBookingResult {
  id: string;
  units: number;
  priceCents: number | null;
}

export async function insertBookingGuarded(
  input: GuardedBookingInput,
): Promise<GuardedBookingResult> {
  const groupSize = Math.max(1, input.groupSize ?? 1);
  const wholeRange = input.wholeRange ?? false;

  return db.transaction(async (tx) => {
    // Serialize all booking writes. Transaction-scoped, auto-released.
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`);

    const [range] = await tx
      .select()
      .from(ranges)
      .where(and(eq(ranges.id, input.rangeId), eq(ranges.active, true)))
      .limit(1);

    if (!range) throw new BookingConflictError("rangeNotFound");
    if (groupSize > range.maxGroupSize) {
      throw new BookingConflictError("groupTooLarge");
    }
    if (wholeRange && !range.allowWholeRange) {
      throw new BookingConflictError("wholeRangeNotAllowed");
    }

    const units = wholeRange ? range.capacity : 1;

    const overlapActive = and(
      inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
      lt(bookings.startsAt, input.endsAt),
      gt(bookings.endsAt, input.startsAt),
    );

    if (range.blocksAll) {
      // Celý areál: conflicts with any active booking on any resource.
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(overlapActive);
      if (row.n > 0) throw new BookingConflictError("slotTaken");
    } else {
      // Blocked when the whole facility is rented for the window.
      const [areal] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(bookings)
        .innerJoin(ranges, eq(bookings.rangeId, ranges.id))
        .where(and(overlapActive, eq(ranges.blocksAll, true)));
      if (areal.n > 0) throw new BookingConflictError("arealBooked");

      const [used] = await tx
        .select({ units: sql<number>`coalesce(sum(${bookings.units}), 0)::int` })
        .from(bookings)
        .where(and(overlapActive, eq(bookings.rangeId, input.rangeId)));
      if (used.units + units > range.capacity) {
        throw new BookingConflictError("slotTaken");
      }
    }

    const hours = Math.round(
      (input.endsAt.getTime() - input.startsAt.getTime()) / 3_600_000,
    );
    const priceCents = computeBookingPrice(range.pricing, {
      hours,
      groupSize,
      wholeRange,
    });

    const [booking] = await tx
      .insert(bookings)
      .values({
        userId: input.userId,
        rangeId: input.rangeId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        guestCount: input.guestCount ?? 0,
        userNote: input.userNote ?? null,
        units,
        wholeRange,
        groupSize,
        priceCents,
        rulesConsentVersionAtBooking: input.rulesConsentVersion ?? "v1",
        ...(input.autopilot
          ? {
              status: "approved" as const,
              decidedAt: new Date(),
              decisionReason: "autopilot",
            }
          : {}),
      })
      .returning({ id: bookings.id });

    return { id: booking.id, units, priceCents };
  });
}
