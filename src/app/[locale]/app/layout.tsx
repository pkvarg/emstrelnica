import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppNav } from "./nav";
import { enforceConsentUpToDate } from "@/lib/consent";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user) {
    redirect(`/${locale}/prihlasenie`);
  }

  if (session.user.role === "admin") {
    redirect(`/${locale}/admin`);
  }

  await enforceConsentUpToDate(session.user.id, locale);

  const t = await getTranslations("common");
  const tRole = await getTranslations("admin.role");

  return (
    <div className="flex min-h-full">
      <AppNav
        user={session.user}
        labels={{
          dashboard: t("dashboard"),
          bookings: t("bookings"),
          profile: t("profile"),
          statistics: t("statistics"),
          roleAdmin: tRole("admin"),
          roleMember: tRole("member"),
          administration: t("administration"),
        }}
        locale={locale}
      />
      <main className="flex-1 p-6 pt-20 md:pt-6">{children}</main>
    </div>
  );
}
