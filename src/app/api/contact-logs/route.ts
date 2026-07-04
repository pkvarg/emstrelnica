import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactBans, contactMessages } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [logs, bans] = await Promise.all([
    db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt))
      .limit(200),
    db.select().from(contactBans),
  ]);

  const bannedEmails = new Set<string>();
  const bannedIps = new Set<string>();
  for (const b of bans) {
    if (b.kind === "email") bannedEmails.add(b.value);
    else if (b.kind === "ip") bannedIps.add(b.value);
  }

  const annotated = logs.map((l) => ({
    ...l,
    emailBanned: l.email ? bannedEmails.has(l.email.toLowerCase()) : false,
    ipBanned: l.ip ? bannedIps.has(l.ip) : false,
  }));

  return NextResponse.json(annotated);
}
