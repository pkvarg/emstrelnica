/**
 * Pricing model for bookable resources (ranges + event spaces).
 *
 * Pure module — no DB imports — safe to use from schema typing, server
 * actions, API routes, client components, and scripts alike.
 *
 * All amounts are EUR cents. Payment is collected on site ("platba na
 * mieste"); the computed total is a price snapshot, not a charge.
 */

export type RangePricing =
  /** Per-box/lane hourly rate (kabínka). Optional 2-person rate per box and
   *  whole-range rental tiers (1h base, discounted from 4h / from 8h). */
  | {
      type: "hourlyUnit";
      unitHourCents: number;
      twoPersonUnitHourCents?: number;
      wholeRange?: {
        hourCents: number;
        from4hHourCents?: number;
        from8hHourCents?: number;
      };
    }
  /** Group-size tiered hourly rate (parkúr: 1/2/3 persons). */
  | { type: "perPersonHourly"; tiers: { persons: number; hourCents: number }[] }
  /** Flat hourly rate (celý areál). */
  | { type: "hourlyFlat"; hourCents: number }
  /** First hour + each additional started hour (altánok). */
  | { type: "firstNext"; firstHourCents: number; nextHourCents: number }
  /** No computable total — price list note or "on request" (trap, miestnosť). */
  | { type: "info"; noteSk: string; noteHu: string };

export interface PriceParams {
  hours: number;
  groupSize: number;
  wholeRange: boolean;
}

/** Returns total in EUR cents, or null when the price is informational only. */
export function computeBookingPrice(
  pricing: RangePricing | null | undefined,
  { hours, groupSize, wholeRange }: PriceParams,
): number | null {
  if (!pricing || hours <= 0) return null;

  switch (pricing.type) {
    case "hourlyUnit": {
      if (wholeRange && pricing.wholeRange) {
        const w = pricing.wholeRange;
        const rate =
          hours >= 8 && w.from8hHourCents
            ? w.from8hHourCents
            : hours >= 4 && w.from4hHourCents
              ? w.from4hHourCents
              : w.hourCents;
        return rate * hours;
      }
      const rate =
        groupSize === 2 && pricing.twoPersonUnitHourCents
          ? pricing.twoPersonUnitHourCents
          : pricing.unitHourCents;
      return rate * hours;
    }
    case "perPersonHourly": {
      const tier =
        pricing.tiers.find((t) => t.persons === groupSize) ??
        pricing.tiers[pricing.tiers.length - 1];
      return tier ? tier.hourCents * hours : null;
    }
    case "hourlyFlat":
      return pricing.hourCents * hours;
    case "firstNext":
      return pricing.firstHourCents + Math.max(0, hours - 1) * pricing.nextHourCents;
    case "info":
      return null;
  }
}

export function formatEur(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}
