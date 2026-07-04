"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { markMembershipPaid } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

export function AddMembershipForm({
  members,
  year,
}: {
  members: Member[];
  year: number;
}) {
  const t = useTranslations("membership");
  const [state, formAction, isPending] = useActionState(markMembershipPaid, null);

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <h2 className="mb-4 font-semibold">{t("recordPayment")}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label>{t("member")}</Label>
          <select name="userId" className="w-full rounded-md border px-3 py-2 text-sm" required>
            <option value="">{t("choose")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.lastName} {m.firstName}
              </option>
            ))}
          </select>
        </div>

        <input type="hidden" name="year" value={year} />

        <div className="space-y-1">
          <Label>{t("sum")}</Label>
          <Input name="feeAmount" type="number" step="0.01" defaultValue="50.00" required />
        </div>

        <div className="space-y-1">
          <Label>{t("method")}</Label>
          <select name="paymentMethod" className="w-full rounded-md border px-3 py-2 text-sm" required>
            <option value="cash">{t("methodCash")}</option>
            <option value="transfer">{t("methodTransfer")}</option>
            <option value="other">{t("methodOther")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>{t("note")}</Label>
          <Input name="note" />
        </div>
      </div>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-green-700">{t("paymentRecorded")}</p>}

      <Button type="submit" className="mt-4" disabled={isPending}>
        {isPending ? "..." : t("recordButton")}
      </Button>
    </form>
  );
}
