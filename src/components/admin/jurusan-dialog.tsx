"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { saveJurusanAction } from "@/app/actions/jurusan";
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
import type { Jenjang } from "@/lib/kelas-shared";
import {
  istilahJurusan,
  KODE_MAX,
  NAMA_MAX,
  normaliseKode,
  type JurusanRow,
} from "@/lib/jurusan-shared";

/**
 * Add / edit a major in a modal.
 *
 * One dialog serves both: pass `jurusan` to edit, `null` to add. Two fields —
 * that is the whole table.
 */
export function JurusanDialog({
  open,
  onOpenChange,
  jurusan,
  jenjang,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jurusan: JurusanRow | null;
  jenjang: Jenjang;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [kode, setKode] = useState("");

  const istilah = istilahJurusan(jenjang);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setKode(jurusan?.kode ?? "");
  }, [open, jurusan]);

  function clearError() {
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The form is `noValidate`, so every rule reports through the same Alert in
    // Indonesian instead of the browser's own bubble.
    if (!normaliseKode(kode)) {
      setError("Kode jurusan wajib diisi.");
      return;
    }
    if (!String(formData.get("nama") ?? "").trim()) {
      setError("Nama jurusan wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await saveJurusanAction({ error: null }, formData);
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
          <DialogTitle>{jurusan ? "Ubah jurusan" : "Tambah jurusan"}</DialogTitle>
          <DialogDescription>
            {jurusan
              ? `Mengubah data ${jurusan.nama}.`
              : `Jurusan dipakai sebagai ${istilah} di form kelas.`}
          </DialogDescription>
        </DialogHeader>

        <form
          key={jurusan?.id ?? "baru"}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {jurusan ? <input type="hidden" name="id" value={jurusan.id} /> : null}

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="kode">Kode</FieldLabel>
              <Input
                id="kode"
                name="kode"
                value={kode}
                onChange={(event) => {
                  setKode(event.target.value.toUpperCase());
                  clearError();
                }}
                placeholder="TKJ"
                maxLength={KODE_MAX}
                autoComplete="off"
                spellCheck={false}
                required
                className="h-9 font-mono uppercase tracking-wide"
              />
              <p className="text-xs text-muted-foreground">
                Identitas singkat, maksimal {KODE_MAX} karakter. Huruf dan angka
                saja.
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="nama">Nama jurusan</FieldLabel>
              <Input
                id="nama"
                name="nama"
                defaultValue={jurusan?.nama ?? ""}
                placeholder="Teknik Komputer dan Jaringan"
                maxLength={NAMA_MAX}
                required
                onChange={clearError}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Maksimal {NAMA_MAX} karakter.
              </p>
            </Field>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>

          <DialogFooter>
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
