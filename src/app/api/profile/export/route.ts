import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, bookings, memberships, auditLog, userWeapons } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phoneE164: users.phoneE164,
      birthDate: users.birthDate,
      addressStreet: users.addressStreet,
      addressCity: users.addressCity,
      addressZip: users.addressZip,
      addressCountry: users.addressCountry,
      role: users.role,
      status: users.status,
      locale: users.locale,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      gdprConsentVersion: users.gdprConsentVersion,
      gdprConsentAt: users.gdprConsentAt,
      rangeRulesConsentVersion: users.rangeRulesConsentVersion,
      rangeRulesConsentAt: users.rangeRulesConsentAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId));

  const userMemberships = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId));

  const userAudit = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.actorUserId, userId));

  const weaponRows = await db
    .select({
      name: userWeapons.name,
      calibre: userWeapons.calibre,
      serialNumberEncrypted: userWeapons.serialNumberEncrypted,
      createdAt: userWeapons.createdAt,
    })
    .from(userWeapons)
    .where(eq(userWeapons.userId, userId))
    .orderBy(asc(userWeapons.createdAt));

  const userWeaponsOut = weaponRows.map((w) => ({
    name: w.name,
    calibre: w.calibre,
    serialNumber: decrypt(w.serialNumberEncrypted) ?? "",
    registeredAt: w.createdAt,
  }));

  const exportData = {
    exportedAt: new Date().toISOString(),
    user,
    bookings: userBookings,
    memberships: userMemberships,
    weapons: userWeaponsOut,
    auditLog: userAudit,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${userId}.json"`,
    },
  });
}
