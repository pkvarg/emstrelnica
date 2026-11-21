import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "./navbar";
import { SessionProvider } from "next-auth/react";
import { CookieBanner } from "./cookie-banner";
import { ConditionalUmami } from "./conditional-umami";
import { DemoBanner } from "./demo-banner";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SessionProvider>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[1000] focus:rounded-sm focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        >
          {t("skipToContent")}
        </a>
        <Navbar />
        <span id="content" tabIndex={-1} className="sr-only" />
        {children}
        <DemoBanner locale={locale} />
        <CookieBanner />
        <ConditionalUmami />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
