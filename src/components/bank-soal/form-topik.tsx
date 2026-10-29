"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, FolderPlusIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";

import { tambahTopikAction, ubahTopikAction } from "@/app/actions/bank-soal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { MapelBankOption, TopikRingkas } from "@/lib/bank-soal-shared";

/**
 * Create or rename a topic.
 *
 * This is the only form that asks for a subject — once the topic exists, its
 * page knows both the subject and the name, so writing questions there never
 * asks again. Name and subject are the whole topic: everything else is derived
 * from the questions inside it.
 */
export function FormTopik({
  mapel,
  awalMapel,
  topik,
}: {
  mapel: MapelBankOption[];
  /** Preselected subject, when arriving from a filtered list. */
  awalMapel?: number | null;
  /** Present means "rename this topic"; absent means "create one". */
  topik?: TopikRingkas;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState(topik?.nama ?? "");
  const [mapelId, setMapelId] = useState(
    String(topik?.mapelId ?? awalMapel ?? mapel[0]?.id ?? ""),
  );

  const judul = topik ? "Ubah topik" : "Topik baru";

  function simpan() {
    setError(null);
    startTransition(async () => {
      if (topik) {
        const hasil = await ubahTopikAction({
          topikId: topik.id,
          nama,
          mapelId: mapelId || null,
        });
        if (hasil.error) {
          setError(hasil.error);
          return;
        }
        router.push(`/guru/bank-soal/topik/${topik.id}`);
        router.refresh();
        return;
      }

      const hasil = await tambahTopikAction({ nama, mapelId: mapelId || null });
      if (hasil.error || !hasil.id) {
        setError(hasil.error ?? "Topik gagal dibuat.");
        return;
      }

      // Straight into the new topic: creating one is only useful as a place to
      // write questions, so the next screen should already be that place.
      router.push(`/guru/bank-soal/topik/${hasil.id}`);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        simpan();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="topik-nama">Nama topik</Label>
        <Input
          id="topik-nama"
          value={nama}
          maxLength={80}
          autoFocus
          placeholder="mis. Laju Reaksi"
          onChange={(event) => {
            setNama(event.target.value);
            setError(null);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Satu topik biasanya satu bab atau satu pertemuan. Soal ditulis di dalam
          topik ini, dan topik inilah yang nanti ditugaskan utuh ke kuis.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topik-mapel">Mata pelajaran</Label>
        <NativeSelect
          id="topik-mapel"
          className="w-full"
          value={mapelId}
          onChange={(event) => {
            setMapelId(event.target.value);
            setError(null);
          }}
        >
          {mapel.length === 0 ? (
            <NativeSelectOption value="">Belum ada mapel</NativeSelectOption>
          ) : null}
          {mapel.map((item) => (
            <NativeSelectOption key={item.id} value={String(item.id)}>
              {item.nama} ({item.ruang} kelas)
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          Hanya mapel yang Anda ampu. Topik dimiliki per mapel, jadi “Laju
          Reaksi” di Kimia dan di PKWU adalah dua topik berbeda.
        </p>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          render={
            <Link
              href={topik ? `/guru/bank-soal/topik/${topik.id}` : "/guru/bank-soal"}
            />
          }
          nativeButton={false}
        >
          <XIcon />
          Batal
        </Button>
        <Button type="submit" disabled={pending || nama.trim() === ""}>
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : topik ? (
            <SaveIcon />
          ) : (
            <FolderPlusIcon />
          )}
          {judul}
          {!topik ? <ArrowRightIcon /> : null}
        </Button>
      </div>
    </form>
  );
}