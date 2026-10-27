"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  updateStudentAction,
  type StudentFormState,
} from "@/app/actions/students";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { KelasOption, PersonRow } from "@/lib/people";

const initialState: StudentFormState = { error: null };

export function StudentForm({
  student,
  kelas,
}: {
  student: PersonRow;
  kelas: KelasOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentAction,
    initialState,
  );
  const [aktif, setAktif] = useState(student.aktif);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={student.id} />
      {/* A hidden input only exists while active, so `aktif` is never submitted
          as an empty string. */}
      {aktif ? <input type="hidden" name="aktif" value="on" /> : null}

      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={student.name}
              maxLength={120}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="username">NISN</FieldLabel>
            <Input
              id="username"
              name="username"
              defaultValue={student.username ?? ""}
              maxLength={50}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email (opsional)</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={student.email ?? ""}
              placeholder="boleh dikosongkan"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="jk">Jenis kelamin</FieldLabel>
            <NativeSelect
              id="jk"
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
            <FieldLabel htmlFor="kelas_id">Kelas</FieldLabel>
            <NativeSelect
              id="kelas_id"
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

          <Field orientation="horizontal" className="items-center pt-6">
            <Switch
              id="aktif"
              checked={aktif}
              onCheckedChange={(checked) => setAktif(checked)}
            />
            <div>
              <FieldLabel htmlFor="aktif">Akun aktif</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Nonaktif = tidak bisa login, data tetap tersimpan.
              </p>
            </div>
          </Field>
        </div>

        {state?.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          <Link
            href="/admin/siswa"
            className={buttonVariants({ variant: "ghost" })}
          >
            Batal
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
