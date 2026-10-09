"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CookieConsent from "react-cookie-consent";
import { useLocale } from "next-intl";
import { incrementVisitors } from "@/lib/visitors";

export const OPEN_COOKIE_SETTINGS = "open-cookie-settings";

const t = {
  sk: {
    text: "So súhlasom meriame návštevnosť nástrojom Umami – bez cookies a bez ukladania IP adresy. Web funguje aj bez súhlasu.",
    more: "Viac informácií",
    accept: "Súhlasím",
    decline: "Odmietnuť",
  },
  hu: {
    text: "Hozzájárulásával az Umami eszközzel mérjük a látogatottságot – sütik és IP-cím tárolása nélkül. Az oldal hozzájárulás nélkül is működik.",
    more: "További információ",
    accept: "Elfogadom",
    decline: "Elutasítom",
  },
};

export function CookieBanner() {
  const locale = useLocale() as "sk" | "hu";
  const l = t[locale] ?? t.sk;
  const [visible, setVisible] = useState<"byCookieValue" | "show" | "hidden">("byCookieValue");

  // "Nastavenia cookies" in the footer reopens the bar to change the choice.
  useEffect(() => {
    const reopen = () => setVisible("show");
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  // ConditionalUmami loads Umami once CookieConsent is "true"; umami.disabled stops an
  // already loaded script at once when consent is withdrawn.
  const decide = (granted: boolean) => {
    localStorage.setItem("CookieConsent", granted ? "true" : "false");
    if (granted) localStorage.removeItem("umami.disabled");
    else localStorage.setItem("umami.disabled", "1");
    if (visible === "byCookieValue") incrementVisitors();
    setVisible("hidden");
  };

  return (
    <CookieConsent
      visible={visible}
      location="bottom"
      style={{
        background: "rgba(24, 24, 27, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "12px 24px",
        fontSize: "13px",
        alignItems: "center",
      }}
      buttonText={l.accept}
      buttonStyle={{
        background: "#d97706",
        color: "#18181b",
        borderRadius: "6px",
        padding: "6px 16px",
        fontSize: "13px",
        fontWeight: "600",
      }}
      enableDeclineButton
      declineButtonText={l.decline}
      declineButtonStyle={{
        background: "transparent",
        color: "#a1a1aa",
        borderRadius: "6px",
        padding: "6px 16px",
        fontSize: "13px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
      expires={365}
      onAccept={() => decide(true)}
      onDecline={() => decide(false)}
    >
      {l.text}{" "}
      <Link href={`/${locale}/gdpr`} className="underline hover:text-white">
        {l.more}
      </Link>
    </CookieConsent>
  );
}
