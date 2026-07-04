import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const HONO_URL = process.env.NEXT_PUBLIC_HONO_API_URL || "http://localhost:3013";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${HONO_URL}/api/stats/strelnica`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ visitors: 0, bots: 0, emails: 0 });
  }
}
