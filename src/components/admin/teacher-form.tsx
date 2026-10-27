"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  updateTeacherAction,
  type TeacherFormState,
} from "@/app/actions/teachers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { PersonRow } from "@/lib/people";

const initialState: TeacherFormState = { error: null };

export function TeacherForm({ teacher }: { teacher: PersonRow }) {
  const [state, formAction, pending] = useActionState(
    updateTeacherAction,
    initialState,
  );
  const [aktif, setAktif] = useState(teacher.aktif);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={teacher.id} />
      {aktif ? <input type="hidden" name="aktif" value="on" /> : null}

      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Nama lengkap &amp; gelar</FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={teacher.name}
              maxLength={120}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="username">NIP</FieldLabel>
            <Input
              id="username"
              name="username"
              defaultValue={teacher.username ?? ""}
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
              defaultValue={teacher.email ?? ""}
              placeholder="boleh dikosongkan"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="jk">Jenis kelamin</FieldLabel>
            <NativeSelect
              id="jk"
              name="jk"
              defaultValue={teacher.jk ?? ""}
              className="w-full"
            >
              <NativeSelectOption value="">Belum diisi</NativeSelectOption>
              <NativeSelectOption value="L">Laki-laki (L)</NativeSelectOption>
              <NativeSelectOption value="P">Perempuan (P)</NativeSelectOption>
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
            href="/admin/guru"
            className={buttonVariants({ variant: "ghost" })}
          >
            Batal
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
