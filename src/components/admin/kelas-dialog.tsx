"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { saveKelasAction } from "@/app/actions/kelas";
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
  contohNama,
  hasJurusan,
  NAMA_MAX,
  tingkatOptions,
  type Jenjang,
  type JurusanOption,
  type KelasRow,
  type WaliOption,
} from "@/lib/kelas-shared";

/**
 * Base UI's Select cannot hold an empty string as a value, so "nothing chosen"
 * needs a stand-in. It never reaches the server: the hidden inputs translate it
 * back to an empty string first.
 */
const NONE = "none";

/**
 * Add / edit a class in a modal.
 *
 * One dialog serves both: pass `kelas` to edit, `null` to add. Field order
 * follows the school's mental model — level first, then the major (SMA/SMK
 * only), then the name, then the homeroom teacher.
 */
export function KelasDialog({
  open,
  onOpenChange,
  jenjang,
  jurusan,
  wali,
  kelas,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jenjang: Jenjang;
  jurusan: JurusanOption[];
  wali: WaliOption[];
  kelas: KelasRow | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const levels = tingkatOptions(jenjang);
  // A class created before `jenjang` existed may sit outside the range. Keep its
  // value selectable so the rest of the row stays editable.
  const legacyTingkat =
    kelas?.tingkat != null && !levels.includes(kelas.tingkat)
      ? kelas.tingkat
      : null;
  const showJurusan = hasJurusan(jenjang);

  const [tingkat, setTingkat] = useState("");
  const [jurusanId, setJurusanId] = useState(NONE);
  const [waliId, setWaliId] = useState(NONE);

  // Opening the dialog always starts from the row being edited — never from the
  // previous attempt's values or its error.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTingkat(kelas?.tingkat != null ? String(kelas.tingkat) : "");
    setJurusanId(kelas?.jurusanId != null ? String(kelas.jurusanId) : NONE);
    setWaliId(kelas?.waliId ?? NONE);
  }, [open, kelas]);

  // Any edit invalidates the message that is on screen — leaving "pick a level"
  // up after the level was picked reads like the form is still unhappy.
  function clearError() {
    setError(null);
  }

  const tingkatItems: Record<string, React.ReactNode> = {};
  if (legacyTingkat !== null) {
    tingkatItems[String(legacyTingkat)] = `${legacyTingkat} — di luar jenjang ${jenjang}`;
  }
  for (const level of levels) tingkatItems[String(level)] = `Tingkat ${level}`;

  const jurusanItems: Record<string, React.ReactNode> = {
    [NONE]: "Tanpa jurusan",
  };
  for (const item of jurusan) {
    jurusanItems[String(item.id)] = `${item.kode} — ${item.nama}`;
  }

  const waliItems: Record<string, React.ReactNode> = {
    [NONE]: "Belum ditentukan",
  };
  for (const item of wali) {
    waliItems[item.id] = item.nip ? `${item.name} · ${item.nip}` : item.name;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The form is `noValidate`, so every rule reports through the same Alert in
    // Indonesian instead of the browser's own bubble.
    if (!tingkat) {
      setError("Pilih tingkat terlebih dahulu.");
      return;
    }
    if (!String(formData.get("nama") ?? "").trim()) {
      setError("Nama kelas wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveKelasAction({ error: null }, formData);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kelas ? "Ubah kelas" : "Tambah kelas"}</DialogTitle>
          <DialogDescription>
            {kelas
              ? `Mengubah data ${kelas.nama}.`
              : `Jenjang sekolah saat ini: ${jenjang}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          key={kelas?.id ?? "baru"}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {kelas ? <input type="hidden" name="id" value={kelas.id} /> : null}
          <input type="hidden" name="tingkat" value={tingkat} />
          <input
            type="hidden"
            name="jurusan_id"
            value={jurusanId === NONE ? "" : jurusanId}
          />
          <input
            type="hidden"
            name="wali_id"
            value={waliId === NONE ? "" : waliId}
          />

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="tingkat">Tingkat</FieldLabel>
              <Select
                items={tingkatItems}
                value={tingkat || null}
                onValueChange={(value) => {
                  setTingkat(String(value ?? ""));
                  clearError();
                }}
              >
                <SelectTrigger
                  id="tingkat"
                  aria-label="Tingkat"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tingkatItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {legacyTingkat !== null ? (
                <p className="text-xs text-muted-foreground">
                  Kelas ini bertingkat {legacyTingkat}, di luar rentang {jenjang}.
                  Pilih tingkat {levels[0]}–{levels[levels.length - 1]} untuk
                  menyesuaikan.
                </p>
              ) : null}
            </Field>

            {showJurusan ? (
              <Field>
                <FieldLabel htmlFor="jurusan_id">Jurusan</FieldLabel>
                <Select
                  items={jurusanItems}
                  value={jurusanId}
                  onValueChange={(value) => {
                    setJurusanId(String(value ?? NONE));
                    clearError();
                  }}
                >
                  <SelectTrigger
                    id="jurusan_id"
                    aria-label="Jurusan"
                    className="w-full justify-between data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(jurusanItems).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="nama">Nama kelas</FieldLabel>
              <Input
                id="nama"
                name="nama"
                defaultValue={kelas?.nama ?? ""}
                placeholder={contohNama(jenjang)}
                maxLength={NAMA_MAX}
                required
                onChange={clearError}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Maksimal {NAMA_MAX} karakter dan tidak boleh sama dengan kelas
                lain.
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="wali_id">Wali kelas</FieldLabel>
              <Select
                items={waliItems}
                value={waliId}
                onValueChange={(value) => {
                    setWaliId(String(value ?? NONE));
                    clearError();
                  }}
              >
                <SelectTrigger
                  id="wali_id"
                  aria-label="Wali kelas"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(waliItems).map(([value, label]) => (
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
