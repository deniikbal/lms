"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  UsersIcon,
} from "lucide-react";

import { simpanNilaiTugasAction } from "@/app/actions/ruang-belajar";
import { HapusPengumpulan } from "@/components/ruang-belajar/hapus-pengumpulan";
import { LihatBerkasNilai } from "@/components/ruang-belajar/lihat-berkas-nilai";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTanggalJam,
  statusPengumpulan,
  type PengumpulanRow,
} from "@/lib/ruang-belajar-shared";

type Peta = Record<string, number | null>;

/** Filter baris berdasarkan chip ringkasan yang diklik; null = semua. */
type Filter = "sudah" | "belum" | "dinilai" | "kurangNilai" | null;

function petaAwal(baris: PengumpulanRow[]): Peta {
  const hasil: Peta = {};
  for (const item of baris) hasil[item.siswaId] = item.nilai;
  return hasil;
}

/** `""` → null, `"85"` → 85, anything else → NaN (rejected before sending). */
function keNilai(teks: string): number | null {
  const isi = teks.trim();
  if (!isi) return null;
  const angka = Number(isi);
  return Number.isInteger(angka) ? angka : NaN;
}

/**
 * The teacher's submission sheet: who sent an answer, what they wrote, and the
 * grade. Grades are edited locally and saved in one request, like the attendance
 * sheet, so a mis-typed 8 does not reach the database.
 */
export function NilaiTugasGrid({
  ruangId,
  tugasId,
  pengumpulan,
}: {
  ruangId: number;
  tugasId: number;
  pengumpulan: PengumpulanRow[];
}) {
  const router = useRouter();
  const [awal, setAwal] = useState<Peta>(() => petaAwal(pengumpulan));
  const [nilai, setNilai] = useState<Peta>(() => petaAwal(pengumpulan));
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const [pending, startTransition] = useTransition();

  const ringkas = useMemo(() => {
    let sudah = 0;
    let dinilai = 0;
    for (const item of pengumpulan) {
      if (item.dikumpulkan) sudah += 1;
      if (nilai[item.siswaId] !== null && nilai[item.siswaId] !== undefined) dinilai += 1;
    }
    return { sudah, belum: pengumpulan.length - sudah, dinilai, kurangNilai: sudah - dinilai, total: pengumpulan.length };
  }, [pengumpulan, nilai]);

  const berubah = useMemo(
    () =>
      pengumpulan
        .map((item) => ({ siswaId: item.siswaId, nilai: nilai[item.siswaId] ?? null }))
        .filter((baris) => (awal[baris.siswaId] ?? null) !== baris.nilai),
    [pengumpulan, nilai, awal],
  );

  /** Filter mengikuti status yang diketik, bukan data server yang basi. */
  const tampil = useMemo(() => {
    if (filter === null) return pengumpulan;
    return pengumpulan.filter((item) => {
      const n = nilai[item.siswaId] ?? null;
      if (filter === "sudah") return item.dikumpulkan;
      if (filter === "belum") return !item.dikumpulkan;
      if (filter === "kurangNilai") return item.dikumpulkan && n === null;
      return n !== null; // "dinilai"
    });
  }, [pengumpulan, nilai, filter]);

  function ubah(id: string, teks: string) {
    const angka = keNilai(teks);
    setNilai((lama) => ({ ...lama, [id]: Number.isNaN(angka) ? lama[id] ?? null : angka }));
    setError(null);
    setPesan(null);
  }

  // router.refresh() mengirim data pengumpulan terbaru tanpa reload halaman.
  // State lokal harus ikut: nilai yang masih sama dengan baseline (tidak
  // sedang diedit) diperbarui ke data terbaru; edit yang belum disimpan
  // tetap dipertahankan agar tidak tertimpa.
  useEffect(() => {
    const segar = petaAwal(pengumpulan);
    setAwal(segar);
    setNilai((lama) => {
      const hasil: Peta = {};
      for (const item of pengumpulan) {
        hasil[item.siswaId] =
          lama[item.siswaId] !== undefined && lama[item.siswaId] !== (awal[item.siswaId] ?? null)
            ? lama[item.siswaId] // edit lokal yang belum disimpan
            : segar[item.siswaId];
      }
      return hasil;
    });
    // `awal` disengaja tidak di dependency: nilai terakhirnya cukup untuk
    // membedakan edit lokal dari data server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengumpulan]);

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
      const hasil = await simpanNilaiTugasAction({
        ruangId,
        tugasId,
        entri: berubah,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setAwal(potret);
      setPesan(
        jumlah === 1 ? "Nilai 1 siswa tersimpan." : `Nilai ${jumlah} siswa tersimpan.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" />
          <span className="tabular-nums">{ringkas.total} siswa</span>
        </span>

        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>

        <div
          role="group"
          aria-label="Ringkasan pengumpulan"
          className="flex flex-wrap items-center gap-1.5"
        >
        <button
          type="button"
          aria-pressed={filter === "sudah"}
          title="Tampilkan hanya yang sudah mengumpulkan"
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            filter === null && "opacity-60 hover:opacity-100",
            filter === "sudah" && "ring-2 ring-offset-1 ring-offset-background",
            TONE.hijau,
          )}
          onClick={() => setFilter(filter === "sudah" ? null : "sudah")}
        >
          Sudah {ringkas.sudah}
        </button>
        <button
          type="button"
          aria-pressed={filter === "belum"}
          title="Tampilkan hanya yang belum mengumpulkan"
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            filter === null && "opacity-60 hover:opacity-100",
            filter === "belum" && "ring-2 ring-offset-1 ring-offset-background",
            TONE.netral,
          )}
          onClick={() => setFilter(filter === "belum" ? null : "belum")}
        >
          Belum {ringkas.belum}
        </button>
        <button
          type="button"
          aria-pressed={filter === "dinilai"}
          title="Tampilkan hanya yang sudah dinilai"
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            filter === null && "opacity-60 hover:opacity-100",
            filter === "dinilai" && "ring-2 ring-offset-1 ring-offset-background",
            TONE.biru,
          )}
          onClick={() => setFilter(filter === "dinilai" ? null : "dinilai")}
        >
          Dinilai {ringkas.dinilai}
        </button>
        <button
          type="button"
          aria-pressed={filter === "kurangNilai"}
          title="Sudah mengumpulkan tetapi belum dinilai"
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            filter === null && "opacity-60 hover:opacity-100",
            filter === "kurangNilai" && "ring-2 ring-offset-1 ring-offset-background",
            TONE.kuning,
          )}
          onClick={() => setFilter(filter === "kurangNilai" ? null : "kurangNilai")}
        >
          Perlu dinilai {ringkas.kurangNilai}
        </button>
        </div>
      </div>

      {ringkas.sudah === 0 && ringkas.dinilai === 0 ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Belum ada siswa yang mengumpulkan jawaban. Nilai tetap bisa diisi
          langsung — misalnya untuk tugas yang dikumpulkan di kertas. Baris
          seperti itu ditandai “Tanpa jawaban” dan tidak dihitung sebagai
          pengumpulan.
        </p>
      ) : null}

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
                className="w-28 px-2 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden w-40 px-2 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase sm:table-cell"
              >
                Dikumpulkan
              </th>
              <th
                scope="col"
                className="w-24 px-2 py-2 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Nilai
              </th>
              <th
                scope="col"
                className="w-10 px-2 py-2"
              >
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {pengumpulan.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Kelas ini belum punya siswa aktif.
                </td>
              </tr>
            ) : (
              tampil.map((item, indeks) => {
                // Follows what is typed, so the badge does not lag behind the
                // server refresh after a save.
                const status = statusPengumpulan({
                  ...item,
                  nilai: nilai[item.siswaId] ?? null,
                });
                // An answer can be opened; a grade can always be written, even
                // for work handed in on paper.
                const adaJawaban = item.dikumpulkan;
                const buka = terbuka === item.siswaId;

                return (
                  <Fragment key={item.siswaId}>
                    <tr className="border-b border-border/50 last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                        {indeks + 1}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        <div className="flex items-center gap-1.5">
                          {adaJawaban ? (
                            <button
                              type="button"
                              onClick={() => setTerbuka(buka ? null : item.siswaId)}
                              aria-expanded={buka}
                              aria-label={`Jawaban ${item.nama}`}
                              className="inline-flex items-center gap-1 rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              <ChevronDownIcon
                                className={cn(
                                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                  buka && "rotate-180",
                                )}
                              />
                              {item.nama}
                            </button>
                          ) : (
                            <span className="pl-[1.25rem]">{item.nama}</span>
                          )}

                          {/*
                            The viewer sits inline: one click opens the PDF, no expand
                            first. The expand row keeps the written answer for those
                            who want it, but is no longer on the file's path.
                          */}
                          {item.fileUrl ? (
                            <LihatBerkasNilai
                              ruangId={ruangId}
                              tugasId={tugasId}
                              pengumpulan={item}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                            TONE[status.tone],
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="hidden px-2 py-2 text-xs text-muted-foreground tabular-nums sm:table-cell">
                        {item.dikumpulkanAt && adaJawaban
                          ? formatTanggalJam(item.dikumpulkanAt)
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          aria-label={`Nilai ${item.nama}`}
                          disabled={pending}
                          placeholder="—"
                          value={nilai[item.siswaId] ?? ""}
                          onChange={(event) => ubah(item.siswaId, event.target.value)}
                          onKeyDown={(event) => {
                            // Enter di kolom nilai = simpan, seperti menekan tombolnya.
                            if (event.key === "Enter") {
                              event.preventDefault();
                              simpan();
                            }
                          }}
                          className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors tabular-nums placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground/50"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <HapusPengumpulan
                          ruangId={ruangId}
                          tugasId={tugasId}
                          siswaId={item.siswaId}
                          nama={item.nama}
                          adaJawaban={adaJawaban}
                          boleh
                        />
                      </td>
                    </tr>

                    {buka ? (
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td colSpan={6} className="px-3 py-3">
                          <p className="mb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                            Jawaban {item.nama}
                          </p>
                          <p className="text-sm whitespace-pre-line text-foreground">
                            {item.teks?.trim() || "—"}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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
              `${berubah.length} nilai belum disimpan.`
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
                Simpan nilai
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
