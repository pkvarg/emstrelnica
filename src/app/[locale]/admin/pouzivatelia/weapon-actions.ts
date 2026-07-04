"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userWeapons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/encryption";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";

export interface WeaponResult {
  error?: string;
  success?: boolean;
}

const MAX_NAME_LEN = 120;
const MAX_CALIBRE_LEN = 60;
const MAX_SERIAL_LEN = 100;

/**
 * Add a weapon to the registry for a given user. Admin-only.
 *
 * Audit entry NEVER contains the plaintext serial number — only a boolean
 * `serialNumberSet`. Same discipline as the `license_update` audit entry.
 */
export async function addWeapon(
  userId: string,
  _prev: WeaponResult | null,
  formData: FormData,
): Promise<WeaponResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  if (!userId) return { error: t("missingUserId") };

  const { allowed } = rateLimit(`admin-weapon-add:${session.user.id}`, 30, 15 * 60 * 1000);
  if (!allowed) return { error: t("tooManyRequests") };

  const name = (formData.get("name") as string)?.trim();
  const calibre = (formData.get("calibre") as string)?.trim();
  const serialNumber = (formData.get("serialNumber") as string)?.trim();

  if (!name) return { error: t("weaponNameRequired") };
  if (!calibre) return { error: t("weaponCalibreRequired") };
  if (!serialNumber) return { error: t("weaponSerialRequired") };

  if (
    name.length > MAX_NAME_LEN ||
    calibre.length > MAX_CALIBRE_LEN ||
    serialNumber.length > MAX_SERIAL_LEN
  ) {
    return { error: t("weaponTooLong") };
  }

  const [inserted] = await db
    .insert(userWeapons)
    .values({
      userId,
      name,
      calibre,
      serialNumberEncrypted: encrypt(serialNumber),
      createdBy: session.user.id,
    })
    .returning({ id: userWeapons.id });

  await writeAudit({
    actorUserId: session.user.id,
    action: "weapon_add",
    entityType: "user_weapon",
    entityId: inserted.id,
    after: {
      userId,
      name,
      calibre,
      serialNumberSet: true,
    },
  });

  revalidatePath(`/admin/pouzivatelia/${userId}`);

  return { success: true };
}

/**
 * Update a weapon. Admin-only.
 *
 * If `serialNumber` comes in empty we preserve the existing encrypted value so
 * an admin can fix a typo in name/calibre without having to re-key the serial.
 * Audit only records booleans (`nameChanged`, `calibreChanged`, `serialChanged`),
 * never plaintext values.
 */
export async function updateWeapon(
  weaponId: string,
  _prev: WeaponResult | null,
  formData: FormData,
): Promise<WeaponResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  if (!weaponId) return { error: t("weaponNotFound") };

  const [before] = await db
    .select()
    .from(userWeapons)
    .where(eq(userWeapons.id, weaponId))
    .limit(1);

  if (!before) return { error: t("weaponNotFound") };

  const name = (formData.get("name") as string)?.trim();
  const calibre = (formData.get("calibre") as string)?.trim();
  const serialNumber = (formData.get("serialNumber") as string)?.trim() ?? "";

  if (!name) return { error: t("weaponNameRequired") };
  if (!calibre) return { error: t("weaponCalibreRequired") };

  if (
    name.length > MAX_NAME_LEN ||
    calibre.length > MAX_CALIBRE_LEN ||
    serialNumber.length > MAX_SERIAL_LEN
  ) {
    return { error: t("weaponTooLong") };
  }

  const serialChanged = serialNumber.length > 0;
  const newSerialEncrypted = serialChanged
    ? encrypt(serialNumber)
    : before.serialNumberEncrypted;

  await db
    .update(userWeapons)
    .set({
      name,
      calibre,
      serialNumberEncrypted: newSerialEncrypted,
      updatedAt: new Date(),
    })
    .where(eq(userWeapons.id, weaponId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "weapon_update",
    entityType: "user_weapon",
    entityId: weaponId,
    before: {
      userId: before.userId,
      nameSet: before.name !== name,
      calibreSet: before.calibre !== calibre,
      serialNumberSet: true,
    },
    after: {
      userId: before.userId,
      nameChanged: before.name !== name,
      calibreChanged: before.calibre !== calibre,
      serialChanged,
    },
  });

  revalidatePath(`/admin/pouzivatelia/${before.userId}`);

  return { success: true };
}

/**
 * Remove a weapon. Admin-only. Audit records only metadata booleans.
 */
export async function removeWeapon(weaponId: string): Promise<WeaponResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const [before] = await db
    .select()
    .from(userWeapons)
    .where(eq(userWeapons.id, weaponId))
    .limit(1);

  if (!before) return { error: t("weaponNotFound") };

  await db.delete(userWeapons).where(eq(userWeapons.id, weaponId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "weapon_remove",
    entityType: "user_weapon",
    entityId: weaponId,
    before: {
      userId: before.userId,
      name: before.name,
      calibre: before.calibre,
      serialNumberSet: true,
    },
  });

  revalidatePath(`/admin/pouzivatelia/${before.userId}`);

  return { success: true };
}
