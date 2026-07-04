import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, userWeapons } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      locale: users.locale,
      zbrojnyPreukazNumberEncrypted: users.zbrojnyPreukazNumberEncrypted,
      zbrojnyPreukazVerifiedAt: users.zbrojnyPreukazVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The member has GDPR "right to access" their own data, so we decrypt and
  // return weapon serials. This endpoint is behind session auth and only ever
  // returns the caller's own rows.
  const weaponRows = await db
    .select({
      name: userWeapons.name,
      calibre: userWeapons.calibre,
      serialNumberEncrypted: userWeapons.serialNumberEncrypted,
    })
    .from(userWeapons)
    .where(eq(userWeapons.userId, session.user.id))
    .orderBy(asc(userWeapons.createdAt));

  const weapons = weaponRows.map((w) => ({
    name: w.name,
    calibre: w.calibre,
    serialNumber: decrypt(w.serialNumberEncrypted) ?? "",
  }));

  // Never leak the encrypted license number to the client. The profile page
  // only needs to know whether a number is on file (to switch the badge).
  const { zbrojnyPreukazNumberEncrypted, ...rest } = user;
  return NextResponse.json({
    ...rest,
    zbrojnyPreukazNumberSet: zbrojnyPreukazNumberEncrypted != null,
    weapons,
  });
}
