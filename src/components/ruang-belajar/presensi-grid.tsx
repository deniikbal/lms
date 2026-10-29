"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, EraserIcon, Loader2Icon, UsersIcon } from "lucide-react";

import { simpanPresensiAction } from "@/app/actions/ruang-belajar";
import { TONE, TONE_PENUH } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ringkasPresensi,
  STATUS_PRESENSI,
  type SiswaPresensi,
  type StatusPresensi,
} from "@/lib/ruang-belajar-shared";

const URUTAN: StatusPresensi[] = ["hadir", "izin", "sakit", "alpa"];

type Peta = Record<string, StatusPresensi | null>;

function petaAwal(siswa: SiswaPresensi[]): Peta {
  const hasil: Peta = {};
  for (const item of siswa) hasil[item.id] = item.status;
  return hasil;
}

/**
 * The teacher's manual attendance sheet.
 *
 * Nothing is written until Simpan: the whole class is edited locally, so a
 * mis-tap costs nothing until it is saved, and Batal restores what the database
 * held when the page opened.
 */
export function PresensiGrid({
  ruangId,
  pertemuanId,
  siswa,
}: {
  ruangId: number;
  pertemuanId: number;
  siswa: SiswaPresensi[];
}) {
  const router = useRouter();
  const [awal, setAwal] = useState<Peta>(() => petaAwal(siswa));
  const [nilai, setNilai] = useState<Peta>(() => petaAwal(siswa));
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ringkasan = useMemo(
    () =>
      ringkasPresensi(siswa.map((item) => ({ status: nilai[item.id] ?? null }))),
    [siswa, nilai],
  );

  const berubah = useMemo(
    () =>
      siswa
        .map((item) => ({ siswaId: item.id, status: nilai[item.id] ?? null }))
        .filter((baris) => (awal[baris.siswaId] ?? null) !== baris.status),
    [siswa, nilai, awal],
  );

  function ubah(id: string, status: StatusPresensi | null) {
    setNilai((lama) => ({ ...lama, [id]: status }));
    setError(null);
    setPesan(null);
  }

  function tandaiSemua(status: StatusPresensi | null) {
    const berikut: Peta = {};
    for (const item of siswa) berikut[item.id] = status;
    setNilai(berikut);
    setError(null);
    setPesan(null);
  }

  function batal() {
    setNilai({ ...awal });
    setError(null);
    setPesan(null);
  }

  function simpan() {
    if (berubah.length === 0) return;
    const potret = { ...nilai };
    const jumlah = berubah.length;

    startTransition(async () => {
      const hasil = await simpanPresensiAction({
        ruangId,
        pertemuanId,
        entri: berubah,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setAwal(potret);
      setPesan(
        jumlah === 1
          ? "Presensi 1 siswa tersimpan."
          : `Presensi ${jumlah} siswa tersimpan.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" />
          <span className="tabular-nums">{ringkasan.total} siswa</span>
        </span>

        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>

        <div
          role="group"
          aria-label="Ringkasan presensi"
          className="flex flex-wrap items-center gap-1.5"
        >
          {URUTAN.map((status) => (
            <span
              key={status}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums",
                TONE[STATUS_PRESENSI[status].tone],
              )}
            >
              {STATUS_PRESENSI[status].label} {ringkasan[status]}
            </span>
          ))}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums",
              TONE.netral,
            )}
          >
            Belum {ringkasan.belum}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => tandaiSemua("hadir")}
            disabled={pending}
          >
            <CheckIcon />
            Tandai semua hadir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => tandaiSemua(null)}
            disabled={pending}
          >
            <EraserIcon />
            Kosongkan
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-left">
              <th
                scope="col"
                className="w-10 px-3 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                No
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Siswa
              </th>
              <th
                scope="col"
                className="hidden px-2 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase sm:table-cell"
              >
                NISN
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Kehadiran
              </th>
            </tr>
          </thead>

          <tbody>
            {siswa.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Kelas ini belum punya siswa aktif.
                </td>
              </tr>
            ) : (
              siswa.map((item, indeks) => {
                const aktif = nilai[item.id] ?? null;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/50 last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                      {indeks + 1}
                    </td>
                    <td className="px-2 py-2 text-foreground">{item.nama}</td>
                    <td className="hidden px-2 py-2 text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {item.nisn ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div
                        role="group"
                        aria-label={`Presensi ${item.nama}`}
                        className="ml-auto flex w-fit overflow-hidden rounded-lg ring-1 ring-border"
                      >
                        {URUTAN.map((status) => {
                          const dipilih = aktif === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              aria-pressed={dipilih}
                              aria-label={`${STATUS_PRESENSI[status].label} untuk ${item.nama}`}
                              title={STATUS_PRESENSI[status].label}
                              onClick={() => ubah(item.id, dipilih ? null : status)}
                              disabled={pending}
                              className={cn(
                                "h-7 w-8 border-r border-border text-[0.7rem] font-semibold transition-colors last:border-r-0 disabled:opacity-60",
                                dipilih
                                  ? TONE_PENUH[STATUS_PRESENSI[status].tone]
                                  : "bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {STATUS_PRESENSI[status].singkat}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 shadow-sm backdrop-blur",
            berubah.length > 0 || error || pesan
              ? "border-border bg-card/95"
              : "border-transparent bg-transparent",
          )}
        >
          <p className="text-xs text-muted-foreground" role="status">
            {pesan ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <CheckIcon className="size-3.5 text-primary" />
                {pesan}
              </span>
            ) : berubah.length > 0 ? (
              `${berubah.length} perubahan belum disimpan.`
            ) : (
              ""
            )}
          </p>

          {berubah.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={batal}
                disabled={pending}
              >
                Batal
              </Button>
              <Button type="button" size="sm" onClick={simpan} disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                Simpan presensi
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
