"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashToken } from "@/lib/tokens";
import argon2 from "argon2";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

interface AcceptResult {
  error?: string;
  success?: boolean;
}

export async function acceptInvitation(
  token: string,
  _prev: AcceptResult | null,
  formData: FormData,
): Promise<AcceptResult> {
  const ip = (await getClientIp()) ?? "unknown";
  const { allowed } = rateLimit(`accept-invite:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts" };

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const gdprConsent = formData.get("gdprConsent") === "on";
  const rulesConsent = formData.get("rulesConsent") === "on";

  if (!password || password.length < 8) {
    return { error: "passwordTooShort" };
  }

  if (password !== confirmPassword) {
    return { error: "passwordMismatch" };
  }

  if (!gdprConsent || !rulesConsent) {
    return { error: "Consents are required" };
  }

  const tokenHash = hashToken(token);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.invitationTokenHash, tokenHash))
    .limit(1);

  if (!user) {
    return { error: "invalidToken" };
  }

  if (user.status !== "invited") {
    return { error: "alreadyAccepted" };
  }

  if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
    return { error: "invalidToken" };
  }

  const passwordHash = await argon2.hash(password);

  await db
    .update(users)
    .set({
      passwordHash,
      status: "active",
      invitationTokenHash: null,
      invitationExpiresAt: null,
      gdprConsentVersion: "v1",
      gdprConsentAt: new Date(),
      rangeRulesConsentVersion: "v1",
      rangeRulesConsentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await writeAudit({
    actorUserId: user.id,
    action: "accept_invitation",
    entityType: "user",
    entityId: user.id,
    before: { status: "invited" },
    after: { status: "active" },
  });

  return { success: true };
}
