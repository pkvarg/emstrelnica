import { NextRequest, NextResponse } from "next/server";

// Legacy endpoint: the check-in UI now lives at /<locale>/check-in/<token>.
// Any old reminder email that still points at /api/check-in?t=... gets
// bounced to the new page so the member sees the confirm button.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${appUrl}/sk/check-in/${encodeURIComponent(token)}`);
}
