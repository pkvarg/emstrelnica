import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { botLog } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userAgent = request.headers.get("user-agent") || "Unknown";
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      null;
    const ipAddress = !rawIp || rawIp === "::1" || rawIp === "127.0.0.1" ? "localhost" : rawIp;

    await db.insert(botLog).values({
      name: body.name || null,
      email: body.email || null,
      phone: body.phone || null,
      message: body.message || null,
      honeypot: body.honeypot || null,
      userAgent,
      ipAddress,
      timeSpent: body.timeSpent || null,
      detectionType: body.detectionType,
      detectionDetails: body.detectionDetails || null,
      locale: body.locale || null,
    });

    console.log("BOT ATTEMPT:", {
      detectionType: body.detectionType,
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error logging bot attempt:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
