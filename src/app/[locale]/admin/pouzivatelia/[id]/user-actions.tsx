"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { setUserStatus, anonymizeUser } from "../actions";
import { Button } from "@/components/ui/button";

export function UserActions({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const t = useTranslations("admin");
  const [confirmAnonymize, setConfirmAnonymize] = useState(false);

  if (status === "anonymized") return null;

  return (
    <div className="flex gap-2">
      {status === "active" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUserStatus(userId, "suspended")}
        >
          {t("suspend")}
        </Button>
      )}

      {status === "suspended" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUserStatus(userId, "active")}
        >
          {t("reactivate")}
        </Button>
      )}

      {!confirmAnonymize ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmAnonymize(true)}
        >
          {t("anonymize")}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-600">{t("anonymizeConfirm")}</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              anonymizeUser(userId);
              setConfirmAnonymize(false);
            }}
          >
            {t("confirm")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAnonymize(false)}
          >
            {t("cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
