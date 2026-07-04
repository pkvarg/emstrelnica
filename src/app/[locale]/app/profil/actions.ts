"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import crypto from "crypto";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { callHono } from "@/lib/notify";
import { generateToken, hashToken } from "@/lib/tokens";

export async function updateProfile(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const { allowed } = rateLimit(`profile:${session.user.id}`, 15, 60 * 60 * 1000);
  if (!allowed) return { error: "Too many requests" };

  const [before] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!before) return { error: "User not found" };

  // Members can only edit their own personal info. License data is admin-only.
  const patch = {
    firstName: (formData.get("firstName") as string)?.trim() || before.firstName,
    lastName: (formData.get("lastName") as string)?.trim() || before.lastName,
    birthDate: (formData.get("birthDate") as string) || before.birthDate,
    addressStreet: (formData.get("addressStreet") as string)?.trim() || before.addressStreet,
    addressCity: (formData.get("addressCity") as string)?.trim() || before.addressCity,
    addressZip: (formData.get("addressZip") as string)?.trim() || before.addressZip,
    addressCountry: (formData.get("addressCountry") as string)?.trim() || before.addressCountry,
    updatedAt: new Date(),
  };

  await db
    .update(users)
    .set(patch)
    .where(eq(users.id, session.user.id));

  await writeAudit({
    actorUserId: session.user.id,
    action: "update_profile",
    entityType: "user",
    entityId: session.user.id,
    before: {
      firstName: before.firstName,
      lastName: before.lastName,
    },
    after: {
      firstName: patch.firstName,
      lastName: patch.lastName,
    },
  });

  revalidatePath("/app/profil");
  return { success: true };
}

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const OTP_TTL_MS = 10 * 60 * 1000;

function hashCodeWithPhone(code: string, phone: string): string {
  return crypto.createHash("sha256").update(`${code}:${phone}`).digest("hex");
}

interface PhoneChangeRequestResult {
  error?: string;
  token?: string;
  success?: boolean;
}

export async function requestPhoneChange(
  _prev: PhoneChangeRequestResult | null,
  formData: FormData,
): Promise<PhoneChangeRequestResult> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const rawPhone = (formData.get("phone") as string | null)?.trim() ?? "";
  if (!PHONE_RE.test(rawPhone)) return { error: "invalidPhone" };

  const { allowed } = rateLimit(`phone-change:${session.user.id}`, 3, 60 * 60 * 1000);
  if (!allowed) return { error: "tooManyRequests" };

  const [current] = await db
    .select({ phoneE164: users.phoneE164 })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!current) return { error: "userNotFound" };
  if (current.phoneE164 === rawPhone) return { error: "samePhone" };

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phoneE164, rawPhone), ne(users.id, session.user.id)))
    .limit(1);
  if (taken) return { error: "phoneTaken" };

  const code = crypto.randomInt(100000, 999999).toString();
  const token = generateToken();

  await db.insert(verificationCodes).values({
    userId: session.user.id,
    purpose: "phone_change",
    codeHash: hashCodeWithPhone(code, rawPhone),
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const result = await callHono("otp/sms", {
    phone: rawPhone,
    code,
    purpose: "phone_change",
    locale: session.user.locale ?? "sk",
  });
  if (!result.success) return { error: "sendFailed" };

  await writeAudit({
    actorUserId: session.user.id,
    action: "phone_change_request",
    entityType: "user",
    entityId: session.user.id,
  });

  return { success: true, token };
}

interface PhoneChangeConfirmResult {
  error?: string;
  success?: boolean;
}

export async function confirmPhoneChange(
  token: string,
  newPhone: string,
  _prev: PhoneChangeConfirmResult | null,
  formData: FormData,
): Promise<PhoneChangeConfirmResult> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const { allowed } = rateLimit(`phone-change-confirm:${session.user.id}`, 10, 15 * 60 * 1000);
  if (!allowed) return { error: "tooManyRequests" };

  const code = ((formData.get("code") as string | null) ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "invalidCode" };
  if (!PHONE_RE.test(newPhone)) return { error: "invalidPhone" };

  const tokenHash = hashToken(token);
  const [vc] = await db
    .select()
    .from(verificationCodes)
    .where(eq(verificationCodes.tokenHash, tokenHash))
    .limit(1);

  if (!vc || vc.purpose !== "phone_change" || vc.userId !== session.user.id) {
    return { error: "invalidToken" };
  }
  if (vc.usedAt || vc.expiresAt < new Date()) return { error: "expiredToken" };
  if (vc.attempts >= 5) return { error: "tooManyAttempts" };

  const expected = hashCodeWithPhone(code, newPhone);
  if (expected !== vc.codeHash) {
    await db
      .update(verificationCodes)
      .set({ attempts: vc.attempts + 1 })
      .where(eq(verificationCodes.id, vc.id));
    return { error: "invalidCode" };
  }

  // Re-check uniqueness at confirm time (race protection)
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phoneE164, newPhone), ne(users.id, session.user.id)))
    .limit(1);
  if (taken) return { error: "phoneTaken" };

  await db
    .update(users)
    .set({
      phoneE164: newPhone,
      phoneVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await db
    .update(verificationCodes)
    .set({ usedAt: new Date() })
    .where(eq(verificationCodes.id, vc.id));

  await writeAudit({
    actorUserId: session.user.id,
    action: "phone_change_confirm",
    entityType: "user",
    entityId: session.user.id,
    after: { phoneE164: newPhone },
  });

  revalidatePath("/app/profil");
  return { success: true };
}
