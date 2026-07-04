"use client";

import React, { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Target, X } from "lucide-react";
import {
  addWeapon,
  removeWeapon,
  updateWeapon,
  type WeaponResult,
} from "../weapon-actions";

export interface AdminWeapon {
  id: string;
  name: string;
  calibre: string;
  serialNumber: string;
}

interface WeaponsSectionProps {
  userId: string;
  weapons: AdminWeapon[];
}

function EditCard({
  weapon,
  onClose,
}: {
  weapon: AdminWeapon;
  onClose: () => void;
}) {
  const t = useTranslations("admin.weapons");
  const tCommon = useTranslations("common");
  const boundAction = updateWeapon.bind(null, weapon.id);
  const [state, formAction, isPending] = useActionState<WeaponResult | null, FormData>(
    boundAction,
    null,
  );

  // Close the card the moment the server action confirms success.
  React.useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <div className="rounded-lg border border-amber-800/50 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-400">{t("editTitle")}</h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300"
          aria-label={tCommon("cancel")}
        >
          <X size={16} />
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("columns.name")}</Label>
            <Input
              name="name"
              required
              maxLength={120}
              defaultValue={weapon.name}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("columns.calibre")}</Label>
            <Input
              name="calibre"
              required
              maxLength={60}
              defaultValue={weapon.calibre}
              placeholder={t("caliberPlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("columns.serial")}</Label>
            <Input
              name="serialNumber"
              maxLength={100}
              defaultValue={weapon.serialNumber}
              placeholder={t("serialPlaceholder")}
              autoComplete="off"
            />
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "..." : t("saveButton")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("cancelButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AddWeaponForm({ userId }: { userId: string }) {
  const t = useTranslations("admin.weapons");
  const boundAction = addWeapon.bind(null, userId);
  const [state, formAction, isPending] = useActionState<WeaponResult | null, FormData>(
    boundAction,
    null,
  );

  // React key bump clears input defaultValues after a successful add without
  // needing refs: remounting the form resets every uncontrolled input.
  const [formKey, setFormKey] = useState(0);
  React.useEffect(() => {
    if (state?.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400">{t("columns.name")}</Label>
          <Input
            name="name"
            required
            maxLength={120}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400">{t("columns.calibre")}</Label>
          <Input
            name="calibre"
            required
            maxLength={60}
            placeholder={t("caliberPlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400">{t("columns.serial")}</Label>
          <Input
            name="serialNumber"
            required
            maxLength={100}
            placeholder={t("serialPlaceholder")}
            autoComplete="off"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {isPending ? "..." : t("addButton")}
        </Button>
      </div>
    </form>
  );
}

export function WeaponsSection({ userId, weapons }: WeaponsSectionProps) {
  const t = useTranslations("admin.weapons");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingWeapon = editingId ? weapons.find((w) => w.id === editingId) : null;

  async function handleRemove(id: string) {
    if (!confirm(t("confirmRemove"))) return;
    await removeWeapon(id);
    if (editingId === id) setEditingId(null);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Target size={18} className="text-amber-500" />
        <h2 className="text-lg font-semibold text-zinc-100">{t("sectionTitle")}</h2>
      </div>

      {editingWeapon && (
        <div className="mb-4">
          <EditCard weapon={editingWeapon} onClose={() => setEditingId(null)} />
        </div>
      )}

      {weapons.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">{t("noWeapons")}</p>
      ) : (
        <div className="mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.calibre")}</TableHead>
                <TableHead>{t("columns.serial")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {weapons.map((w) => (
                <React.Fragment key={w.id}>
                  <TableRow className={editingId === w.id ? "bg-amber-900/10" : ""}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.calibre}</TableCell>
                    <TableCell className="font-mono text-xs">{w.serialNumber}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-zinc-400 hover:text-amber-400"
                          onClick={() => setEditingId(editingId === w.id ? null : w.id)}
                          aria-label={t("editButton")}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleRemove(w.id)}
                        >
                          {t("removeButton")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-300">{t("addWeapon")}</h3>
        <AddWeaponForm userId={userId} />
      </div>
    </div>
  );
}
