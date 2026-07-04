import { NextResponse } from "next/server";
import { db } from "@/db";
import { ranges } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const allRanges = await db
    .select({ id: ranges.id, nameSk: ranges.nameSk, nameHu: ranges.nameHu })
    .from(ranges)
    .where(eq(ranges.active, true))
    .orderBy(asc(ranges.sortOrder));

  return NextResponse.json(allRanges);
}
