"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { updateStudentAction } from "@/app/actions/students";
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
import type { KelasOption, PersonRow } from "@/lib/people-shared";

export function StudentDialog({
  open,
  onOpenChange,
  student,
  kelas,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: PersonRow | null;
  kelas: KelasOption[];
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aktif, setAktif] = useState(true);

  useEffect(() => {
    if (!open || !student) return;
    setError(null);
    setAktif(student.aktif);
  }, [open, student]);

  if (!student) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (name.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
      setError("NISN wajib 3–50 karakter (huruf, angka, titik, underscore).");
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Format email tidak valid.");
      return;
    }

    startTransition(async () => {
      const result = await updateStudentAction({ error: null }, formData);
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
          <DialogTitle>Ubah data siswa</DialogTitle>
          <DialogDescription>
            {student.name} · {student.username ?? "tanpa NISN"}
          </DialogDescription>
        </DialogHeader>

        <form
          key={student.id}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          <input type="hidden" name="id" value={student.id} />
          {aktif ? <input type="hidden" name="aktif" value="on" /> : null}

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="modal-student-name">Nama lengkap</FieldLabel>
              <Input
                id="modal-student-name"
                name="name"
                defaultValue={student.name}
                maxLength={120}
                required
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="modal-student-username">NISN</FieldLabel>
              <Input
                id="modal-student-username"
                name="username"
                defaultValue={student.username ?? ""}
                maxLength={50}
                required
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="modal-student-email">Email (opsional)</FieldLabel>
              <Input
                id="modal-student-email"
                name="email"
                type="email"
                defaultValue={student.email ?? ""}
                placeholder="boleh dikosongkan"
                autoComplete="off"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="modal-student-jk">Jenis kelamin</FieldLabel>
                <NativeSelect
                  id="modal-student-jk"
                  name="jk"
                  defaultValue={student.jk ?? ""}
                  className="w-full"
                >
                  <NativeSelectOption value="">Belum diisi</NativeSelectOption>
                  <NativeSelectOption value="L">Laki-laki (L)</NativeSelectOption>
                  <NativeSelectOption value="P">Perempuan (P)</NativeSelectOption>
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="modal-student-kelas">Kelas</FieldLabel>
                <NativeSelect
                  id="modal-student-kelas"
                  name="kelas_id"
                  defaultValue={student.kelasId ? String(student.kelasId) : ""}
                  className="w-full"
                >
                  <NativeSelectOption value="">Tanpa kelas</NativeSelectOption>
                  {kelas.map((item) => (
                    <NativeSelectOption key={item.id} value={String(item.id)}>
                      {item.nama}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field orientation="horizontal" className="items-center justify-between pt-1">
              <div>
                <FieldLabel htmlFor="modal-student-aktif">Akun aktif</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Nonaktif = tidak bisa login, data tetap tersimpan.
                </p>
              </div>
              <Switch
                id="modal-student-aktif"
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
