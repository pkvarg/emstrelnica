import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRateLimitEntries,
  clearRateLimitKey,
  clearAllRateLimits,
} from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getRateLimitEntries());
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await req.json();

  if (key === "__all__") {
    clearAllRateLimits();
    return NextResponse.json({ cleared: "all" });
  }

  const deleted = clearRateLimitKey(key);
  return NextResponse.json({ cleared: deleted });
}
