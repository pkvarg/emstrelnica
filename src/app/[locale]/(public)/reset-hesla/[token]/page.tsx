"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useParams } from "next/navigation";
import { resetPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const t = useTranslations("passwordReset");
  const { token } = useParams<{ token: string }>();

  const boundAction = resetPassword.bind(null, token);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm p-6 text-center">
          <p className="text-green-700">{t("success")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <h1 className="text-center text-2xl font-bold">{t("title")}</h1>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{t(state.error)}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
            disabled={isPending}
          >
            {isPending ? "..." : t("reset")}
          </Button>
        </form>
      </div>
    </div>
  );
}
