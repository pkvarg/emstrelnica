import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "fallback-secret";

export function createCheckInToken(bookingId: string): string {
  const payload = `${bookingId}:${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyCheckInToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 3) return null;

    const bookingId = parts[0];
    const timestamp = parseInt(parts[1], 10);
    const sig = parts[2];

    // Token valid for 2 hours
    if (Date.now() - timestamp > 2 * 60 * 60 * 1000) return null;

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(`${bookingId}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);

    if (sig !== expected) return null;
    return bookingId;
  } catch {
    return null;
  }
}
