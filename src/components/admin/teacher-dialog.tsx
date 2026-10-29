"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { createTeacherAction } from "@/app/actions/teachers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";

export function TeacherDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAktif(true);
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();

    if (name.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
      setError("NIP wajib 3–50 karakter (huruf, angka, titik, underscore).");
      return;
    }

    startTransition(async () => {
      const result = await createTeacherAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah guru</DialogTitle>
          <DialogDescription>
            NIP dipakai sebagai username dan password awal login guru.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {aktif ? <input type="hidden" name="aktif" value="on" /> : null}

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="teacher-name">Nama lengkap &amp; gelar</FieldLabel>
              <Input
                id="teacher-name"
                name="name"
                placeholder="Drs. Budi Santoso, M.Pd"
                maxLength={120}
                required
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="teacher-username">NIP</FieldLabel>
              <Input
                id="teacher-username"
                name="username"
                placeholder="198001012005011001"
                maxLength={50}
                required
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="teacher-email">Email (opsional)</FieldLabel>
              <Input
                id="teacher-email"
                name="email"
                type="email"
                placeholder="guru@sekolah.sch.id"
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="teacher-jk">Jenis kelamin</FieldLabel>
              <NativeSelect
                id="teacher-jk"
                name="jk"
                defaultValue=""
                className="w-full"
              >
                <NativeSelectOption value="">Belum diisi</NativeSelectOption>
                <NativeSelectOption value="L">Laki-laki (L)</NativeSelectOption>
                <NativeSelectOption value="P">Perempuan (P)</NativeSelectOption>
              </NativeSelect>
            </Field>

            <Field orientation="horizontal" className="items-center justify-between pt-1">
              <div>
                <FieldLabel htmlFor="teacher-aktif">Akun aktif</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Bisa login langsung setelah akun dibuat.
                </p>
              </div>
              <Switch
                id="teacher-aktif"
                checked={aktif}
                onCheckedChange={setAktif}
              />
            </Field>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
