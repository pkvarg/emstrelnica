import { db } from "@/db";
import { adminApprovalTokens, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/tokens";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueApprovalTokens(bookingId: string) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        eq(users.status, "active"),
        eq(users.receivesBookingRequests, true),
      ),
    );

  const tokens: { adminUserId: string; action: "approve" | "decline"; token: string }[] = [];

  for (const admin of admins) {
    for (const action of ["approve", "decline"] as const) {
      const token = generateToken();
      tokens.push({ adminUserId: admin.id, action, token });

      await db.insert(adminApprovalTokens).values({
        bookingId,
        adminUserId: admin.id,
        action,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      });
    }
  }

  return tokens;
}

export async function invalidateSiblingTokens(bookingId: string, excludeTokenId: string) {
  const siblings = await db
    .select({ id: adminApprovalTokens.id })
    .from(adminApprovalTokens)
    .where(eq(adminApprovalTokens.bookingId, bookingId));

  for (const sibling of siblings) {
    if (sibling.id === excludeTokenId) continue;
    await db
      .update(adminApprovalTokens)
      .set({ usedAt: new Date(), usedIp: "invalidated" })
      .where(eq(adminApprovalTokens.id, sibling.id));
  }
}
