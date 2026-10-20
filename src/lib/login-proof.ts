import crypto from "crypto";

/**
 * One-minute, server-only proof that a user has already passed every login step (password, and for
 * admins the email OTP or a trusted device). Passed straight from a server action to
 * `signIn("credentials", { proof })`, so it never reaches the browser. This lets the OTP step finish
 * the sign-in without keeping the admin's password around, and lets `authorize` refuse admin
 * password logins that did not go through the OTP.
 */
const TTL_SECONDS = 60;

function key(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return `login-proof|${s}`;
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const sign = (body: string) => b64url(crypto.createHmac("sha256", key()).update(body).digest());

export function issueLoginProof(userId: string): string {
  const body = b64url(
    JSON.stringify({
      uid: userId,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
      n: crypto.randomBytes(8).toString("hex"),
    }),
  );
  return `${body}.${sign(body)}`;
}

export function verifyLoginProof(proof: string | undefined | null): string | null {
  if (!proof) return null;
  const [body, sig] = proof.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
    const data = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8"),
    ) as { uid?: unknown; exp?: unknown };
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid;
  } catch {
    return null;
  }
}
