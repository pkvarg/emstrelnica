"use client";

import { useLocale } from "next-intl";
import { OPEN_COOKIE_SETTINGS } from "./cookie-banner";

export function CookieSettingsButton({ className }: { className?: string }) {
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
      className={className}
    >
      {locale === "hu" ? "Süti-beállítások" : "Nastavenia cookies"}
    </button>
  );
}
