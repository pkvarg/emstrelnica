"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { signIn, validateAdminCredentials } from "@/lib/auth";
import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { notifyAdminLoginOtp } from "@/lib/notify";
import { generateToken, hashToken } from "@/lib/tokens";
import {
  TRUSTED_DEVICE_COOKIE,
  verifyTrustedDevice,
} from "@/lib/trusted-device";
import {
  ADMIN_LOGIN_TICKET_COOKIE,
  ADMIN_LOGIN_TICKET_TTL_SECONDS,
  signAdminLoginTicket,
} from "@/lib/admin-login-ticket";

function sanitizeCallbackUrl(raw: string, locale: string): string | null {
  if (!raw) return null;
  // Only allow relative paths scoped to the current locale, no protocol / host.
  if (!raw.startsWith(`/${locale}/`)) return null;
  if (raw.includes("://") || raw.startsWith("//")) return null;
  return raw;
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const login = formData.get("login") as string;
  const password = formData.get("password") as string;
  const callbackUrlRaw = (formData.get("callbackUrl") as string) || "";

  if (!login || !password) {
    return { error: "invalidCredentials" };
  }

  const ip = (await getClientIp()) ?? "unknown";
  const { allowed } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return { error: "invalidCredentials" };
  }

  const creds = await validateAdminCredentials(login, password);
  if (!creds) {
    return { error: "invalidCredentials" };
  }

  // --- Admin path: require email OTP unless a trusted-device cookie is valid.
  if (creds.role === "admin") {
    const jar = await cookies();
    const trustedCookie = jar.get(TRUSTED_DEVICE_COOKIE)?.value;
    const trustedUserId = trustedCookie
      ? await verifyTrustedDevice(trustedCookie)
      : null;

    if (trustedUserId && trustedUserId === creds.id) {
      // Trusted device — proceed straight to signIn.
      await writeAudit({
        actorUserId: creds.id,
        action: "login_trusted_device",
        entityType: "user",
        entityId: creds.id,
      });

      return await completeSignInAndRedirect(login, password, creds.id, creds.role);
    }

    // Otherwise issue an email OTP and redirect to /admin-otp.
    const code = crypto.randomInt(100000, 999999).toString();
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: creds.id,
      purpose: "admin_login",
      codeHash: hashToken(code),
      tokenHash,
      expiresAt,
    });

    // Ticket binds the already-verified password to the pending OTP row so
    // the OTP page can later call signIn without re-prompting.
    const ticket = signAdminLoginTicket({
      userId: creds.id,
      login,
      password,
      verificationTokenHash: tokenHash,
    });

    jar.set(ADMIN_LOGIN_TICKET_COOKIE, ticket, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_LOGIN_TICKET_TTL_SECONDS,
      path: "/",
    });

    // Fire-and-forget email; don't block redirect on SMTP delays.
    notifyAdminLoginOtp({
      email: creds.email,
      code,
      locale: creds.locale,
      userId: creds.id,
    }).catch((e) => console.error("[loginAction] admin-otp email failed:", e));

    await writeAudit({
      actorUserId: creds.id,
      action: "admin_login_otp_sent",
      entityType: "user",
      entityId: creds.id,
    });

    const locale = await getLocale();
    redirect(`/${locale}/admin-otp`);
  }

  // --- Member path: regular sign-in.
  const locale = await getLocale();
  const callbackUrl = sanitizeCallbackUrl(callbackUrlRaw, locale);
  return await completeSignInAndRedirect(
    login,
    password,
    creds.id,
    creds.role,
    callbackUrl,
  );
}

async function completeSignInAndRedirect(
  login: string,
  password: string,
  userId: string,
  role: "admin" | "member",
  callbackUrl?: string | null,
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      login,
      password,
      redirect: false,
    });

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));

    await writeAudit({
      actorUserId: userId,
      action: "login",
      entityType: "user",
      entityId: userId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalidCredentials" };
    }
    throw error;
  }

  const locale = await getLocale();
  if (role === "admin") {
    redirect(`/${locale}/admin`);
  }
  redirect(callbackUrl ?? `/${locale}/app`);
}
