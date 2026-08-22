"use server";

import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/tokens";
import crypto from "crypto";
import { writeAudit } from "@/lib/audit";
import { notifyPasswordReset } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export async function requestPasswordReset(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { error: "Email is required" };

  const ip = await getClientIp() ?? "unknown";
  const { allowed } = rateLimit(`reset:${ip}`, 3, 15 * 60 * 1000);
  if (!allowed) return { success: true };

  const [user] = await db
    .select({ id: users.id, status: users.status, locale: users.locale, firstName: users.firstName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always return success to avoid email enumeration
  if (!user) return { success: true };

  // Suspended/anonymized accounts can't log in regardless of password —
  // don't send a reset link that leads to a dead end.
  if (user.status === "suspended" || user.status === "anonymized") {
    return { success: true };
  }

  // Invited users have no active account yet: a password reset would
  // "succeed" but login still refuses non-active accounts. Re-issue the
  // invitation instead so they finish registration properly.
  if (user.status === "invited") {
    const inviteToken = generateToken();
    await db
      .update(users)
      .set({
        invitationTokenHash: hashToken(inviteToken),
        invitationExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5001";
    const { notifyInvitation } = await import("@/lib/notify");
    notifyInvitation({
      email,
      firstName: user.firstName || "používateľ",
      invitationUrl: `${appUrl}/${user.locale || "sk"}/pozvanka/${inviteToken}`,
      locale: user.locale || "sk",
      userId: user.id,
    }).catch(console.error);

    await writeAudit({
      actorUserId: user.id,
      action: "invitation_resent_via_password_reset",
      entityType: "user",
      entityId: user.id,
    });

    return { success: true };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const token = generateToken();

  await db.insert(verificationCodes).values({
    userId: user.id,
    purpose: "password_reset",
    codeHash: hashToken(code),
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5001";
  const resetUrl = `${appUrl}/sk/reset-hesla/${token}`;

  notifyPasswordReset({
    email,
    firstName: "používateľ",
    resetUrl,
    locale: "sk",
    userId: user.id,
  }).catch(console.error);

  return { success: true };
}

export async function resetPassword(
  token: string,
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const ip = (await getClientIp()) ?? "unknown";
  const { allowed } = rateLimit(`reset-confirm:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return { error: "tooManyAttempts" };

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) return { error: "passwordTooShort" };
  if (password !== confirmPassword) return { error: "passwordMismatch" };

  const tokenHash = hashToken(token);

  const [vc] = await db
    .select()
    .from(verificationCodes)
    .where(eq(verificationCodes.tokenHash, tokenHash))
    .limit(1);

  if (!vc || vc.usedAt || vc.expiresAt < new Date()) {
    return { error: "invalidToken" };
  }

  // Guard: only accounts that are allowed to log in may reset a password.
  // Login (validateAdminCredentials) refuses anything except
  // active/pending_verification, so resetting would be a silent dead end.
  const [account] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, vc.userId))
    .limit(1);

  if (!account || account.status === "anonymized") {
    return { error: "invalidToken" };
  }
  if (account.status === "invited") {
    return { error: "accountNotActivated" };
  }
  if (account.status === "suspended") {
    return { error: "accountSuspended" };
  }

  const argon2 = await import("argon2");
  const passwordHash = await argon2.hash(password);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, vc.userId));

  await db
    .update(verificationCodes)
    .set({ usedAt: new Date() })
    .where(eq(verificationCodes.id, vc.id));

  await writeAudit({
    actorUserId: vc.userId,
    action: "password_reset",
    entityType: "user",
    entityId: vc.userId,
  });

  return { success: true };
}
