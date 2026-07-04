import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(eq(bookings.status, "requested"));

  return NextResponse.json({ count: row?.count ?? 0 });
}
