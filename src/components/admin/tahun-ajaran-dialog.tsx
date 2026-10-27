"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { saveTahunAjaranAction, type TahunAjaranRow } from "@/app/actions/tahun-ajaran";
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

const SEMESTER_ITEMS: Record<string, string> = {
  Ganjil: "Ganjil",
  Genap: "Genap",
};

const AKTIF_ITEMS: Record<string, string> = {
  true: "Ya",
  false: "Tidak",
};

export function TahunAjaranDialog({
  open,
  onOpenChange,
  row,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: TahunAjaranRow | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [nama, setNama] = useState("");
  const [semester, setSemester] = useState("Ganjil");
  const [aktif, setAktif] = useState("false");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNama(row?.nama ?? "");
    setSemester(row?.semester ?? "Ganjil");
    setAktif(row?.aktif ? "true" : "false");
  }, [open, row]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!nama.trim()) {
      setError("Nama tahun ajaran wajib diisi.");
      return;
    }
    if (!semester) {
      setError("Semester wajib dipilih.");
      return;
    }
    startTransition(async () => {
      const result = await saveTahunAjaranAction({ error: null }, formData);
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
          <DialogTitle>{row ? "Ubah tahun ajaran" : "Tambah tahun ajaran"}</DialogTitle>
          <DialogDescription>
            {row
              ? `Mengubah data ${row.nama}.`
              : "Tahun ajaran dipakai untuk mengelompokkan kelas dan jadwal."}
          </DialogDescription>
        </DialogHeader>

        <form
          key={row?.id ?? "baru"}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <input type="hidden" name="nama" value={nama} />
          <input type="hidden" name="semester" value={semester} />
          <input type="hidden" name="aktif" value={aktif} />

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="nama">Nama</FieldLabel>
              <Input
                id="nama"
                name="nama"
                value={nama}
                placeholder="2026/2027"
                maxLength={40}
                required
                onChange={(e) => {
                  setNama(e.target.value);
                  setError(null);
                }}
                className="h-9"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="semester">Semester</FieldLabel>
              <Select
                items={SEMESTER_ITEMS}
                value={semester}
                onValueChange={(value) => {
                  setSemester(String(value ?? "Ganjil"));
                  setError(null);
                }}
              >
                <SelectTrigger
                  id="semester"
                  aria-label="Semester"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEMESTER_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="aktif">Aktif</FieldLabel>
              <Select
                items={AKTIF_ITEMS}
                value={aktif}
                onValueChange={(value) => {
                  setAktif(String(value ?? "false"));
                  setError(null);
                }}
              >
                <SelectTrigger
                  id="aktif"
                  aria-label="Aktif"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AKTIF_ITEMS).map(([value, label]) => (
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
