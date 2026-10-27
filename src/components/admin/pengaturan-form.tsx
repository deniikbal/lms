"use client";

import { useState, useTransition, type FormEvent } from "react";

import { savePengaturanAction, type PengaturanSekolahRow } from "@/app/actions/pengaturan";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

const JENJANG_ITEMS: Record<string, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  SMK: "SMK",
};

export function PengaturanForm({
  initial,
}: {
  initial: PengaturanSekolahRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [jenjangValue, setJenjangValue] = useState<string>(initial?.jenjang ?? "SMK");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await savePengaturanAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
    });
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pengaturan Sekolah
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola data master sekolah: nama, alamat, jenjang, kepala sekolah, KKM, dan NPSN.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Data Sekolah</CardTitle>
            <CardDescription>
              Nilai ini terbaca dari database dan menjadi acuan sistem.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="nama_sekolah">Nama Sekolah</FieldLabel>
                <Input
                  id="nama_sekolah"
                  name="nama_sekolah"
                  defaultValue={initial?.nama_sekolah ?? ""}
                  placeholder="SMK Nusantara Cendekia"
                  maxLength={120}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="alamat">Alamat Sekolah</FieldLabel>
                <Input
                  id="alamat"
                  name="alamat"
                  defaultValue={initial?.alamat ?? ""}
                  placeholder="Jl. Pendidikan No. 17, Yogyakarta"
                  maxLength={255}
                  required
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="jenjang">Jenjang</FieldLabel>
                  <input type="hidden" name="jenjang" value={jenjangValue} />
                  <Select
                    items={JENJANG_ITEMS}
                    value={jenjangValue}
                    onValueChange={(value) => {
                      setJenjangValue(String(value ?? "SMK"));
                      setError(null);
                    }}
                    required
                  >
                    <SelectTrigger
                      id="jenjang"
                      aria-label="Jenjang"
                      className="w-full justify-between data-[size=default]:h-9"
                    >
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(JENJANG_ITEMS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="kkm">KKM</FieldLabel>
                  <Input
                    id="kkm"
                    name="kkm"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={initial?.kkm ?? 75}
                    placeholder="75"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="npsn">NPSN</FieldLabel>
                  <Input
                    id="npsn"
                    name="npsn"
                    type="text"
                    defaultValue={initial?.npsn ?? ""}
                    placeholder="20123456"
                    maxLength={20}
                    required
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="kepala_sekolah">Kepala Sekolah</FieldLabel>
                <Input
                  id="kepala_sekolah"
                  name="kepala_sekolah"
                  defaultValue={initial?.kepala_sekolah ?? ""}
                  placeholder="Dra. Sri Wahyuni, M.Pd."
                  maxLength={120}
                  required
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={pending}
          >
            Kembalikan ke Database
          </Button>
        </div>
      </form>
    </div>
  );
}
