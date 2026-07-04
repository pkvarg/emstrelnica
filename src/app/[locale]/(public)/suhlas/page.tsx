"use client";

import { useTranslations } from "next-intl";
import { acceptConsents } from "./actions";
import { Button } from "@/components/ui/button";

export default function ConsentPage() {
  const t = useTranslations("invitation");

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6 text-center">
        <h1 className="text-2xl font-bold">
          {t("title")}
        </h1>
        <p className="text-sm text-zinc-500">
          Podmienky boli aktualizované. Pre pokračovanie ich prosím odsúhlaste.
        </p>

        <div className="space-y-3 text-left">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" id="gdpr" required className="mt-0.5" />
            {t("acceptGdpr")}
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" id="rules" required className="mt-0.5" />
            {t("acceptRules")}
          </label>
        </div>

        <Button
          className="w-full"
          onClick={async () => {
            const gdpr = (document.getElementById("gdpr") as HTMLInputElement)?.checked;
            const rules = (document.getElementById("rules") as HTMLInputElement)?.checked;
            if (!gdpr || !rules) return;
            await acceptConsents();
          }}
        >
          {t("activate")}
        </Button>
      </div>
    </div>
  );
}
