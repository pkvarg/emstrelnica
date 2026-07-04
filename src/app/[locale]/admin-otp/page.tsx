import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import {
  ADMIN_LOGIN_TICKET_COOKIE,
  verifyAdminLoginTicket,
} from "@/lib/admin-login-ticket";
import { AdminOtpForm } from "./otp-form";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.charAt(0)}***@${domain}`;
}

export default async function AdminOtpPage() {
  const locale = await getLocale();
  const jar = await cookies();
  const ticketCookie = jar.get(ADMIN_LOGIN_TICKET_COOKIE)?.value;
  const ticket = verifyAdminLoginTicket(ticketCookie);

  if (!ticket) {
    redirect(`/${locale}/prihlasenie`);
  }

  const [vc] = await db
    .select({
      id: verificationCodes.id,
      usedAt: verificationCodes.usedAt,
      expiresAt: verificationCodes.expiresAt,
    })
    .from(verificationCodes)
    .where(eq(verificationCodes.tokenHash, ticket.verificationTokenHash))
    .limit(1);

  if (!vc || vc.usedAt || vc.expiresAt < new Date()) {
    redirect(`/${locale}/prihlasenie`);
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, ticket.userId))
    .limit(1);

  if (!user) {
    redirect(`/${locale}/prihlasenie`);
  }

  const t = await getTranslations("auth.emailOtp");
  const maskedEmail = maskEmail(user.email);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-zinc-500">
            {t("sentTo", { email: maskedEmail })}
          </p>
        </div>

        <AdminOtpForm />
      </div>
    </div>
  );
}
