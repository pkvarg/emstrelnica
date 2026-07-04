"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { inviteMember } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteDialog() {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(inviteMember, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        {t("inviteMember")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inviteMember")}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("inviteFirstName")}</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("inviteLastName")}</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("inviteEmail")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("invitePhone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+421..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">{t("inviteLocale")}</Label>
            <select
              id="locale"
              name="locale"
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue="sk"
            >
              <option value="sk">{t("locale.sk")}</option>
              <option value="hu">{t("locale.hu")}</option>
            </select>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          {state?.success && state.invitationUrl && (
            <div className="space-y-2 rounded-md bg-green-50 p-3 text-sm">
              <p className="font-medium text-green-800">{t("inviteSent")}</p>
              <input
                type="text"
                readOnly
                value={state.invitationUrl}
                className="w-full rounded border bg-white px-2 py-1 text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "..." : t("inviteMember")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
