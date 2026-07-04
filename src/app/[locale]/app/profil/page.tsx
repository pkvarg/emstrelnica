"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneChange } from "./phone-change";

type ProfileWeapon = {
  name: string;
  calibre: string;
  serialNumber: string;
};

type ProfileData = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneE164: string | null;
  birthDate: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  zbrojnyPreukazVerifiedAt: string | null;
  zbrojnyPreukazNumberSet?: boolean;
  weapons?: ProfileWeapon[];
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tWeapons = useTranslations("profile.weapons");
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [user, setUser] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setUser);
  }, [state]);

  if (!user) return <p>{t("title")}...</p>;

  const isVerified = !!user.zbrojnyPreukazVerifiedAt;
  const weapons = user.weapons ?? [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {state?.success && (
        <p className="mt-2 text-sm text-emerald-400">{t("updated")}</p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("firstName")}</Label>
            <Input name="firstName" defaultValue={user.firstName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t("lastName")}</Label>
            <Input name="lastName" defaultValue={user.lastName ?? ""} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("email")}</Label>
          <Input value={user.email ?? ""} disabled />
        </div>

        <PhoneChange currentPhone={user.phoneE164 ?? ""} />

        <div className="space-y-2">
          <Label>{t("birthDate")}</Label>
          <Input name="birthDate" type="date" defaultValue={user.birthDate ?? ""} />
        </div>

        <h2 className="pt-4 text-lg font-semibold">{t("address")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("street")}</Label>
            <Input name="addressStreet" defaultValue={user.addressStreet ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t("city")}</Label>
            <Input name="addressCity" defaultValue={user.addressCity ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t("zip")}</Label>
            <Input name="addressZip" defaultValue={user.addressZip ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t("country")}</Label>
            <Input name="addressCountry" defaultValue={user.addressCountry ?? ""} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <h2 className="text-lg font-semibold">{t("license")}</h2>
          {isVerified ? (
            <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              {t("licenseVerifiedBadge")}
            </span>
          ) : (
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
              {t("licenseUnverifiedBadge")}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{t("licenseReadOnlyHint")}</p>

        <h2 className="pt-4 text-lg font-semibold">{tWeapons("title")}</h2>
        {weapons.length === 0 ? (
          <p className="text-sm text-zinc-500">{tWeapons("empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-left text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{tWeapons("columns.name")}</th>
                  <th className="px-3 py-2 font-medium">{tWeapons("columns.calibre")}</th>
                  <th className="px-3 py-2 font-medium">{tWeapons("columns.serial")}</th>
                </tr>
              </thead>
              <tbody>
                {weapons.map((w, i) => (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{w.name}</td>
                    <td className="px-3 py-2">{w.calibre}</td>
                    <td className="px-3 py-2 font-mono text-xs">{w.serialNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "..." : t("personalInfo")}
          </Button>
          <a
            href="/api/profile/export"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            {t("exportData")}
          </a>
        </div>
      </form>
    </div>
  );
}
