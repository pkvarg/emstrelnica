import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminNav } from "./nav";
import { enforceConsentUpToDate } from "@/lib/consent";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user) {
    redirect(`/${locale}/prihlasenie`);
  }

  if (session.user.role !== "admin") {
    redirect(`/${locale}/app`);
  }

  await enforceConsentUpToDate(session.user.id, locale);

  const t = await getTranslations("common");

  return (
    <div className="flex min-h-full">
      <AdminNav
        user={session.user}
        labels={{
          dashboard: t("dashboard"),
          users: t("users"),
          bookings: t("bookings"),
          membership: t("membership"),
          openingHours: t("openingHours"),
          closures: t("closures"),
          statistics: t("statistics"),
          audit: t("audit"),
          logout: t("logout"),
        }}
        locale={locale}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
