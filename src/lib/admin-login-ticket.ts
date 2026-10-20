import crypto from "crypto";

/**
 * Short-lived HMAC-signed ticket that proves the user has already passed the
 * password check and links to their pending email OTP. After the OTP is
 * verified, `submitAdminOtp` signs in with a server-side login proof
 * (lib/login-proof.ts), so the ticket never carries the password.
 *
 * Stored in an httpOnly cookie (`admin_login_ticket`) so the raw JSON never
 * reaches the browser JS. The HMAC is keyed with AUTH_SECRET so a stolen
 * cookie from another environment is useless. TTL: 10 minutes.
 */
export const ADMIN_LOGIN_TICKET_COOKIE = "admin_login_ticket";
export const ADMIN_LOGIN_TICKET_TTL_SECONDS = 10 * 60;

interface TicketPayload {
  userId: string;
  /** Hash of the verification_codes.tokenHash so we can match to the DB row. */
  verificationTokenHash: string;
  exp: number;
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

export function signAdminLoginTicket(
  payload: Omit<TicketPayload, "exp">,
): string {
  // Only these fields are signed into the cookie; nothing else a caller passes ends up in it.
  const full: TicketPayload = {
    userId: payload.userId,
    verificationTokenHash: payload.verificationTokenHash,
    exp: Math.floor(Date.now() / 1000) + ADMIN_LOGIN_TICKET_TTL_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(full));
  const sig = b64urlEncode(
    crypto.createHmac("sha256", getSecret()).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyAdminLoginTicket(
  cookieValue: string | undefined,
): TicketPayload | null {
  if (!cookieValue) return null;
  const [body, sig] = cookieValue.split(".");
  if (!body || !sig) return null;

  const expected = b64urlEncode(
    crypto.createHmac("sha256", getSecret()).update(body).digest(),
  );

  // Constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as TicketPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.verificationTokenHash !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
