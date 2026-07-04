import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

export default async function MemberDashboard() {
  const session = await auth();
  const t = await getTranslations("common");

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {session?.user?.name}
      </p>
    </div>
  );
}
