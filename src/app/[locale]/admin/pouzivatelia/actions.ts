"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, userWeapons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/tokens";
import { encrypt } from "@/lib/encryption";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { notifyInvitation } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

interface InviteResult {
  error?: string;
  success?: boolean;
  invitationUrl?: string;
}

export async function inviteMember(
  _prev: InviteResult | null,
  formData: FormData,
): Promise<InviteResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const { allowed } = rateLimit(`invite:${session.user.id}`, 10, 15 * 60 * 1000);
  if (!allowed) return { error: t("tooManyInvitations") };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const locale = (formData.get("locale") as string) || "sk";

  if (!email || !phone || !firstName || !lastName) {
    return { error: t("allFieldsRequired") };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { error: t("userWithEmailExists") };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      phoneE164: phone,
      firstName,
      lastName,
      locale: locale as "sk" | "hu",
      status: "invited",
      role: "member",
      invitedBy: session.user.id,
      invitationTokenHash: tokenHash,
      invitationExpiresAt: expiresAt,
    })
    .returning({ id: users.id });

  await writeAudit({
    actorUserId: session.user.id,
    action: "invite",
    entityType: "user",
    entityId: newUser.id,
    after: { email, phone, firstName, lastName, locale },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${appUrl}/${locale}/pozvanka/${token}`;

  notifyInvitation({
    email,
    firstName,
    invitationUrl,
    locale,
    userId: newUser.id,
  }).catch(console.error);

  revalidatePath("/admin/pouzivatelia");

  return { success: true, invitationUrl };
}

interface EditResult {
  error?: string;
  success?: boolean;
}

export async function updateUserAdmin(
  userId: string,
  _prev: EditResult | null,
  formData: FormData,
): Promise<EditResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const { allowed } = rateLimit(`admin-edit-user:${session.user.id}`, 30, 15 * 60 * 1000);
  if (!allowed) return { error: t("tooManyRequests") };

  const [before] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!before) return { error: t("userNotFound") };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const birthDate = (formData.get("birthDate") as string)?.trim() || null;
  const addressStreet = (formData.get("addressStreet") as string)?.trim() || null;
  const addressCity = (formData.get("addressCity") as string)?.trim() || null;
  const addressZip = (formData.get("addressZip") as string)?.trim() || null;
  const addressCountry = (formData.get("addressCountry") as string)?.trim() || null;
  const locale = (formData.get("locale") as string) === "hu" ? "hu" : "sk";
  const role = (formData.get("role") as string) === "admin" ? "admin" : "member";
  const notesAdmin = (formData.get("notesAdmin") as string)?.trim() || null;

  if (!firstName || !lastName || !email || !phone) {
    return { error: t("nameEmailPhoneRequired") };
  }

  // Prevent email / phone collisions with other users
  if (email !== before.email) {
    const [collision] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (collision && collision.id !== userId) {
      return { error: t("emailInUse") };
    }
  }
  if (phone !== before.phoneE164) {
    const [collision] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phoneE164, phone))
      .limit(1);
    if (collision && collision.id !== userId) {
      return { error: t("phoneInUse") };
    }
  }

  // Admin demoting themselves from admin would lock everyone out; guard.
  if (before.id === session.user.id && role !== "admin") {
    return { error: t("cannotRemoveSelfAdmin") };
  }

  await db
    .update(users)
    .set({
      firstName,
      lastName,
      email,
      phoneE164: phone,
      birthDate,
      addressStreet,
      addressCity,
      addressZip,
      addressCountry,
      locale,
      role,
      notesAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "admin_edit_user",
    entityType: "user",
    entityId: userId,
    before: {
      firstName: before.firstName,
      lastName: before.lastName,
      email: before.email,
      phoneE164: before.phoneE164,
      role: before.role,
      locale: before.locale,
    },
    after: {
      firstName,
      lastName,
      email,
      phoneE164: phone,
      role,
      locale,
    },
  });

  revalidatePath(`/admin/pouzivatelia/${userId}`);
  revalidatePath("/admin/pouzivatelia");
  return { success: true };
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended",
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const [before] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!before) throw new Error("User not found");

  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "status_change",
    entityType: "user",
    entityId: userId,
    before: { status: before.status },
    after: { status },
  });

  revalidatePath("/admin/pouzivatelia");
}

export async function anonymizeUser(userId: string) {
  const t = await getTranslations("admin.anonymized");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const [before] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!before) throw new Error("User not found");

  // Remove weapon registry entries as part of anonymisation. The FK is
  // `on delete cascade` for the case of a hard user delete, but since we
  // only update the user row in place here, we must delete weapons explicitly.
  await db.delete(userWeapons).where(eq(userWeapons.userId, userId));

  await db
    .update(users)
    .set({
      email: `anonymized-${userId}@deleted.local`,
      phoneE164: `+000${userId.slice(0, 10)}`,
      firstName: t("firstName"),
      lastName: t("lastName"),
      birthDate: null,
      addressStreet: null,
      addressCity: null,
      addressZip: null,
      zbrojnyPreukazNumberEncrypted: null,
      zbrojnyPreukazVerifiedAt: null,
      zbrojnyPreukazVerifiedBy: null,
      passwordHash: null,
      notesAdmin: null,
      status: "anonymized",
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "anonymize",
    entityType: "user",
    entityId: userId,
    before: {
      email: before.email,
      firstName: before.firstName,
      lastName: before.lastName,
      status: before.status,
    },
    after: { status: "anonymized", weaponsCleared: true },
  });

  revalidatePath("/admin/pouzivatelia");
}

// --- Zbrojny preukaz (firearms license) ---

export interface LicenseResult {
  error?: string;
  success?: boolean;
}

export async function updateUserLicense(
  _prev: LicenseResult | null,
  formData: FormData,
): Promise<LicenseResult> {
  const t = await getTranslations("admin.errors");
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: t("unauthorized") };
  }

  const userId = formData.get("userId") as string;
  if (!userId) return { error: t("missingUserId") };

  const number = (formData.get("number") as string)?.trim() || null;
  const markVerified = formData.get("markVerified") === "on";

  // Fetch current record for audit diff
  const [before] = await db
    .select({
      zbrojnyPreukazNumberEncrypted: users.zbrojnyPreukazNumberEncrypted,
      zbrojnyPreukazVerifiedAt: users.zbrojnyPreukazVerifiedAt,
      zbrojnyPreukazVerifiedBy: users.zbrojnyPreukazVerifiedBy,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!before) return { error: t("userNotFound") };

  // Encrypt the license number if provided. Note: encryption is non-deterministic
  // (AES-GCM with random IV), so ciphertexts for the same plaintext differ —
  // we therefore cannot detect "number changed" by comparing ciphertexts.
  // Instead we treat any non-empty submission as an authoritative write.
  const encryptedNumber = number ? encrypt(number) : null;

  const now = new Date();
  const hadNumberBefore = before.zbrojnyPreukazNumberEncrypted != null;

  // Verification handling:
  // - If admin checks "markVerified", set verification to now / this admin.
  // - Else, if a number was written that wasn't there before, clear verification
  //   so the pairing (who/when verified which number) stays honest.
  // - Else preserve existing verification (e.g. admin only re-saves without change).
  let zbrojnyPreukazVerifiedAt: Date | null = before.zbrojnyPreukazVerifiedAt;
  let zbrojnyPreukazVerifiedBy: string | null = before.zbrojnyPreukazVerifiedBy;

  if (markVerified && encryptedNumber != null) {
    zbrojnyPreukazVerifiedAt = now;
    zbrojnyPreukazVerifiedBy = session.user.id;
  } else if (encryptedNumber != null && !hadNumberBefore) {
    // New number added without verification flag -> unverified until admin verifies
    zbrojnyPreukazVerifiedAt = null;
    zbrojnyPreukazVerifiedBy = null;
  } else if (encryptedNumber == null && hadNumberBefore) {
    // Number cleared -> verification no longer meaningful
    zbrojnyPreukazVerifiedAt = null;
    zbrojnyPreukazVerifiedBy = null;
  }

  await db
    .update(users)
    .set({
      zbrojnyPreukazNumberEncrypted: encryptedNumber,
      zbrojnyPreukazVerifiedAt,
      zbrojnyPreukazVerifiedBy,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  // Audit log -- do NOT log the actual license number, only booleans.
  await writeAudit({
    actorUserId: session.user.id,
    action: "license_update",
    entityType: "user",
    entityId: userId,
    before: {
      numberSet: hadNumberBefore,
      verified: before.zbrojnyPreukazVerifiedAt != null,
    },
    after: {
      numberSet: encryptedNumber != null,
      verified: zbrojnyPreukazVerifiedAt != null,
      markVerified,
    },
  });

  revalidatePath(`/admin/pouzivatelia/${userId}`);
  revalidatePath("/admin/pouzivatelia");

  return { success: true };
}

export async function verifyUserLicense(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db
    .update(users)
    .set({
      zbrojnyPreukazVerifiedAt: new Date(),
      zbrojnyPreukazVerifiedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "license_verify",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath(`/admin/pouzivatelia/${userId}`);
}

export async function unverifyUserLicense(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db
    .update(users)
    .set({
      zbrojnyPreukazVerifiedAt: null,
      zbrojnyPreukazVerifiedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writeAudit({
    actorUserId: session.user.id,
    action: "license_unverify",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath(`/admin/pouzivatelia/${userId}`);
}
