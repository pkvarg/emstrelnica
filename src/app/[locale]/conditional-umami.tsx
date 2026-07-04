"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export function ConditionalUmami() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem("CookieConsent");
      if (consent === "true") {
        setHasConsent(true);
      }
    };

    checkConsent();

    window.addEventListener("storage", checkConsent);
    const interval = setInterval(checkConsent, 1000);

    return () => {
      window.removeEventListener("storage", checkConsent);
      clearInterval(interval);
    };
  }, []);

  if (!hasConsent) return null;

  return (
    <Script
      defer
      src="https://umami-p00gs00gwcwo00s4k4c4kgg8.pictusweb.com/script.js"
      data-website-id="ecd53fd2-60e7-4545-b466-b03a621773de"
    />
  );
}
