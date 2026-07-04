import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "./navbar";
import { SessionProvider } from "next-auth/react";
import { CookieBanner } from "./cookie-banner";
import { ConditionalUmami } from "./conditional-umami";

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SessionProvider>
        <Navbar />
        {children}
        <CookieBanner />
        <ConditionalUmami />
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
