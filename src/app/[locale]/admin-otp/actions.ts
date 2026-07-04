"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { signIn } from "@/lib/auth";
import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import { hashToken } from "@/lib/tokens";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  ADMIN_LOGIN_TICKET_COOKIE,
  verifyAdminLoginTicket,
} from "@/lib/admin-login-ticket";
import {
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_TTL_SECONDS,
  issueTrustedDevice,
} from "@/lib/trusted-device";

const MAX_ATTEMPTS = 5;

type Result = { error?: string } | null;

export async function submitAdminOtp(
  _prev: Result,
  formData: FormData,
): Promise<Result> {
  const locale = await getLocale();
  const jar = await cookies();

  const ticketCookie = jar.get(ADMIN_LOGIN_TICKET_COOKIE)?.value;
  const ticket = verifyAdminLoginTicket(ticketCookie);
  if (!ticket) {
    redirect(`/${locale}/prihlasenie`);
  }

  // Per-user rate limit on OTP attempts (5 attempts / 5min) on top of the
  // row-level attempts counter below.
  const { allowed } = rateLimit(
    `admin_otp:${ticket.userId}`,
    MAX_ATTEMPTS,
    5 * 60 * 1000,
  );
  if (!allowed) {
    return { error: "emailOtpLocked" };
  }

  const codeRaw = formData.get("code");
  const code =
    typeof codeRaw === "string" ? codeRaw.replace(/\s+/g, "").trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return { error: "emailOtpInvalid" };
  }

  const rememberDevice = formData.get("rememberDevice") === "1";

  const [vc] = await db
    .select()
    .from(verificationCodes)
    .where(eq(verificationCodes.tokenHash, ticket.verificationTokenHash))
    .limit(1);

  if (
    !vc ||
    vc.userId !== ticket.userId ||
    vc.purpose !== "admin_login" ||
    vc.usedAt ||
    vc.expiresAt < new Date()
  ) {
    return { error: "emailOtpInvalid" };
  }

  if (vc.attempts >= MAX_ATTEMPTS) {
    // Expire the row so further submits fall into the first branch.
    await db
      .update(verificationCodes)
      .set({ expiresAt: new Date() })
      .where(eq(verificationCodes.id, vc.id));
    return { error: "emailOtpLocked" };
  }

  const codeMatches = vc.codeHash === hashToken(code);

  if (!codeMatches) {
    const newAttempts = vc.attempts + 1;
    await db
      .update(verificationCodes)
      .set({
        attempts: newAttempts,
        // Lock the row on the final wrong attempt.
        ...(newAttempts >= MAX_ATTEMPTS ? { expiresAt: new Date() } : {}),
      })
      .where(eq(verificationCodes.id, vc.id));

    await writeAudit({
      actorUserId: ticket.userId,
      action: "admin_login_otp_failed",
      entityType: "user",
      entityId: ticket.userId,
    });

    return {
      error: newAttempts >= MAX_ATTEMPTS ? "emailOtpLocked" : "emailOtpInvalid",
    };
  }

  // Success — mark used, then complete sign-in.
  await db
    .update(verificationCodes)
    .set({ usedAt: new Date() })
    .where(eq(verificationCodes.id, vc.id));

  try {
    await signIn("credentials", {
      login: ticket.login,
      password: ticket.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Shouldn't happen — password was valid 10 minutes ago. Treat as
      // generic failure and make the user start over.
      jar.delete(ADMIN_LOGIN_TICKET_COOKIE);
      redirect(`/${locale}/prihlasenie`);
    }
    throw error;
  }

  if (rememberDevice) {
    const deviceToken = await issueTrustedDevice(ticket.userId);
    jar.set(TRUSTED_DEVICE_COOKIE, deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TRUSTED_DEVICE_TTL_SECONDS,
      path: "/",
    });
  }

  jar.delete(ADMIN_LOGIN_TICKET_COOKIE);

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, ticket.userId));

  await writeAudit({
    actorUserId: ticket.userId,
    action: "admin_login_otp_ok",
    entityType: "user",
    entityId: ticket.userId,
  });

  redirect(`/${locale}/admin`);
}
