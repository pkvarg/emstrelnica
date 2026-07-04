import { db } from "@/db";
import { users, memberships, bookings, userWeapons } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { decrypt } from "@/lib/encryption";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { UserActions } from "./user-actions";
import { LicenseForm } from "./license-form";
import { LicenseVerifyButton } from "./license-verify-button";
import { EditUserForm } from "./edit-form";
import { WeaponsSection, type AdminWeapon } from "./weapons-section";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("admin");
  const tBooking = await getTranslations("booking");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) notFound();

  // Decrypt zbrojny preukaz number (server-only, admin eyes only)
  const zpNumber = user.zbrojnyPreukazNumberEncrypted
    ? decrypt(user.zbrojnyPreukazNumberEncrypted)
    : null;

  // Resolve the name of the admin who verified the license (if any)
  let verifiedByName: string | null = null;
  if (user.zbrojnyPreukazVerifiedBy) {
    const [verifier] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, user.zbrojnyPreukazVerifiedBy))
      .limit(1);
    if (verifier) {
      verifiedByName = `${verifier.firstName} ${verifier.lastName}`.trim();
    }
  }

  // Decrypt weapon serial numbers server-side so they never traverse the
  // network in ciphertext. Admin-only page, admin-only data.
  const weaponRows = await db
    .select({
      id: userWeapons.id,
      name: userWeapons.name,
      calibre: userWeapons.calibre,
      serialNumberEncrypted: userWeapons.serialNumberEncrypted,
    })
    .from(userWeapons)
    .where(eq(userWeapons.userId, id))
    .orderBy(asc(userWeapons.createdAt));

  const weapons: AdminWeapon[] = weaponRows.map((w) => ({
    id: w.id,
    name: w.name,
    calibre: w.calibre,
    serialNumber: decrypt(w.serialNumberEncrypted) ?? "",
  }));

  const userMemberships = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, id))
    .orderBy(desc(memberships.year));

  const userBookings = await db
    .select({
      id: bookings.id,
      rangeId: bookings.rangeId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.userId, id))
    .orderBy(desc(bookings.startsAt))
    .limit(20);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{t("userDetail")}</h1>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium">{t("user.name")}</dt>
            <dd>{user.firstName} {user.lastName}</dd>
            <dt className="font-medium">{t("user.email")}</dt>
            <dd>{user.email}</dd>
            <dt className="font-medium">{t("user.phone")}</dt>
            <dd>{user.phoneE164}</dd>
            <dt className="font-medium">{t("user.role")}</dt>
            <dd>{t(`role.${user.role}` as "role.member")}</dd>
            <dt className="font-medium">{t("user.status")}</dt>
            <dd>{t(`userStatus.${user.status}` as "userStatus.active")}</dd>
            <dt className="font-medium">{t("user.locale")}</dt>
            <dd>{t(`locale.${user.locale}` as "locale.sk")}</dd>
            <dt className="font-medium">{t("user.created")}</dt>
            <dd>{fmtDateTime(user.createdAt)}</dd>
            <dt className="font-medium">{t("user.lastLogin")}</dt>
            <dd>{user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : "—"}</dd>
          </dl>
        </div>

        <UserActions userId={user.id} status={user.status} />

        <EditUserForm
          userId={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          phone={user.phoneE164}
          birthDate={user.birthDate}
          addressStreet={user.addressStreet}
          addressCity={user.addressCity}
          addressZip={user.addressZip}
          addressCountry={user.addressCountry}
          locale={user.locale}
          role={user.role}
          notesAdmin={user.notesAdmin}
        />

        {/* Zbrojny preukaz — single admin-only editor */}
        <div className="space-y-2">
          <LicenseForm
            userId={user.id}
            number={zpNumber}
            verifiedAt={user.zbrojnyPreukazVerifiedAt}
            verifiedByName={verifiedByName}
          />
          {zpNumber && (
            <div className="flex justify-end">
              <LicenseVerifyButton
                userId={user.id}
                isVerified={!!user.zbrojnyPreukazVerifiedAt}
              />
            </div>
          )}
        </div>

        <WeaponsSection userId={user.id} weapons={weapons} />

        <div>
          <h2 className="text-lg font-semibold">{t("user.memberships")}</h2>
          {userMemberships.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">{t("user.noMemberships")}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {userMemberships.map((m) => (
                <li key={m.year}>
                  {m.year} — {m.feeAmount} {m.currency}{" "}
                  {m.paidAt
                    ? `(${t("user.paidOn", { date: fmtDate(m.paidAt) })})`
                    : `(${t("user.unpaidShort")})`}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold">{t("user.recentBookings")}</h2>
          {userBookings.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">{t("user.noBookings")}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {userBookings.map((b) => (
                <li key={b.id}>
                  {b.rangeId} — {fmtDateTime(b.startsAt)} → {fmtDateTime(b.endsAt)} [{tBooking(`status.${b.status}` as "status.requested")}]
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
