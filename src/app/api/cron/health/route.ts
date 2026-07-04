import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    return NextResponse.json({ status: "ok", db: result.length > 0 });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: (e as Error).message },
      { status: 500 },
    );
  }
}
