import crypto from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { trustedAdminDevices } from "@/db/schema";
import { getClientIp } from "@/lib/ip";

export const TRUSTED_DEVICE_COOKIE = "td";
export const TRUSTED_DEVICE_TTL_MS = 10 * 24 * 60 * 60 * 1000;
export const TRUSTED_DEVICE_TTL_SECONDS = 10 * 24 * 60 * 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Issue a new trusted-device token for this admin user. Returns the
 * plaintext token which the caller should place in the `td` cookie.
 */
export async function issueTrustedDevice(userId: string): Promise<string> {
  const hdrs = await headers().catch(() => null);
  const userAgent = hdrs?.get("user-agent") ?? null;
  const ip = await getClientIp().catch(() => null);

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRUSTED_DEVICE_TTL_MS);

  await db.insert(trustedAdminDevices).values({
    userId,
    tokenHash,
    userAgent,
    ip,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
  });

  return token;
}

/**
 * Look up a trusted-device cookie value. Returns the userId if the token
 * matches a non-expired row, else null. Bumps lastSeenAt on hit.
 */
export async function verifyTrustedDevice(
  cookieValue: string,
): Promise<string | null> {
  if (!cookieValue) return null;

  const tokenHash = hashToken(cookieValue);
  const now = new Date();

  const [row] = await db
    .select({
      id: trustedAdminDevices.id,
      userId: trustedAdminDevices.userId,
    })
    .from(trustedAdminDevices)
    .where(
      and(
        eq(trustedAdminDevices.tokenHash, tokenHash),
        gt(trustedAdminDevices.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Best-effort update of lastSeenAt; do not fail auth if it errors.
  try {
    await db
      .update(trustedAdminDevices)
      .set({ lastSeenAt: now })
      .where(eq(trustedAdminDevices.id, row.id));
  } catch {
    // swallow
  }

  return row.userId;
}

/**
 * Revoke every trusted device for a given user. Keep available for admin
 * tooling that wants to force a fresh email OTP on all previously-trusted
 * browsers.
 */
export async function revokeAllTrustedDevicesForUser(
  userId: string,
): Promise<void> {
  await db
    .delete(trustedAdminDevices)
    .where(eq(trustedAdminDevices.userId, userId));
}
