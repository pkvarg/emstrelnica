import { NextResponse } from "next/server";
import { db } from "@/db";
import { ranges } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const allRanges = await db
    .select({
      id: ranges.id,
      nameSk: ranges.nameSk,
      nameHu: ranges.nameHu,
      kind: ranges.kind,
      capacity: ranges.capacity,
      maxGroupSize: ranges.maxGroupSize,
      blocksAll: ranges.blocksAll,
      allowWholeRange: ranges.allowWholeRange,
      descriptionSk: ranges.descriptionSk,
      descriptionHu: ranges.descriptionHu,
      pricing: ranges.pricing,
    })
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  return NextResponse.json(allRanges);
}
