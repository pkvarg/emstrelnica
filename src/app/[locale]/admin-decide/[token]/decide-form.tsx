"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { executeDecision } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DecideForm({
  token,
  action,
}: {
  token: string;
  action: string;
}) {
  const t = useTranslations("admin");
  const boundAction = executeDecision.bind(null, token);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <p className="font-medium text-green-800">
          {state.action === "approved"
            ? t("decide.approvedMessage")
            : t("decide.declinedMessage")}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {action === "decline" && (
        <div className="space-y-2">
          <Label htmlFor="reason">{t("declineReason")}</Label>
          <Input id="reason" name="reason" />
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        variant={action === "approve" ? "default" : "destructive"}
        disabled={isPending}
      >
        {isPending
          ? "..."
          : action === "approve"
            ? t("approve")
            : t("decline")}
      </Button>
    </form>
  );
}
