"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { saveMapelAction } from "@/app/actions/mapel";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KELOMPOK,
  KODE_MAX,
  NAMA_MAX,
  normaliseKode,
  type Kelompok,
  type MapelRow,
} from "@/lib/mapel-shared";

const KELOMPOK_ITEMS: Record<string, React.ReactNode> = Object.fromEntries(
  KELOMPOK.map((item) => [item, item]),
);

/**
 * Add / edit a subject in a modal.
 *
 * One dialog serves both: pass `mapel` to edit, `null` to add. Only the three
 * fields the table owns are here — KKM, weights, and the class a subject is
 * taught in belong to `ruang`, not to the subject.
 */
export function MapelDialog({
  open,
  onOpenChange,
  mapel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapel: MapelRow | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [kode, setKode] = useState("");
  const [kelompok, setKelompok] = useState<Kelompok>("Umum");

  // Opening always starts from the row being edited — never from the previous
  // attempt's values or its error.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setKode(mapel?.kode ?? "");
    setKelompok(mapel?.kelompok ?? "Umum");
  }, [open, mapel]);

  function clearError() {
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The form is `noValidate`, so every rule reports through the same Alert in
    // Indonesian instead of the browser's own bubble.
    const kodeValue = normaliseKode(kode);
    if (!kodeValue) {
      setError("Kode mapel wajib diisi.");
      return;
    }
    if (!String(formData.get("nama") ?? "").trim()) {
      setError("Nama mapel wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await saveMapelAction({ error: null }, formData);
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
          <DialogTitle>{mapel ? "Ubah mapel" : "Tambah mapel"}</DialogTitle>
          <DialogDescription>
            {mapel
              ? `Mengubah data ${mapel.nama}.`
              : "Mapel hanya berisi identitas. KKM dan bobot nilai diatur per ruang belajar."}
          </DialogDescription>
        </DialogHeader>

        <form
          key={mapel?.id ?? "baru"}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {mapel ? <input type="hidden" name="id" value={mapel.id} /> : null}
          <input type="hidden" name="kelompok" value={kelompok} />

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
                placeholder="MTK"
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
              <FieldLabel htmlFor="nama">Nama mapel</FieldLabel>
              <Input
                id="nama"
                name="nama"
                defaultValue={mapel?.nama ?? ""}
                placeholder="Matematika"
                maxLength={NAMA_MAX}
                required
                onChange={clearError}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Maksimal {NAMA_MAX} karakter, mis. &ldquo;Dasar-dasar Teknik
                Jaringan&rdquo;.
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="kelompok">Kelompok</FieldLabel>
              <Select
                items={KELOMPOK_ITEMS}
                value={kelompok}
                onValueChange={(value) => {
                  setKelompok((value as Kelompok) ?? "Umum");
                  clearError();
                }}
              >
                <SelectTrigger
                  id="kelompok"
                  aria-label="Kelompok"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KELOMPOK_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
