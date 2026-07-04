"use client";

import CookieConsent from "react-cookie-consent";
import { useLocale } from "next-intl";
import { incrementVisitors } from "@/lib/visitors";

const t = {
  sk: {
    text: "Táto stránka používa cookies na zlepšenie vášho zážitku.",
    accept: "Súhlasím",
    decline: "Odmietnuť",
  },
  hu: {
    text: "Ez a weboldal sütiket használ a felhasználói élmény javítása érdekében.",
    accept: "Elfogadom",
    decline: "Elutasítom",
  },
};

export function CookieBanner() {
  const locale = useLocale() as "sk" | "hu";
  const l = t[locale];

  const handleChoice = async () => {
    await incrementVisitors();
  };

  return (
    <CookieConsent
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
      onAccept={() => {
        localStorage.setItem("CookieConsent", "true");
        handleChoice();
      }}
      onDecline={() => {
        localStorage.setItem("CookieConsent", "false");
        handleChoice();
      }}
    >
      {l.text}
    </CookieConsent>
  );
}
