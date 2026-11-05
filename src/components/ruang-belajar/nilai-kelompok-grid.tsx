"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  type BarisPengumpulanKelompok,
  type RuangHeader,
  type TugasDetail,
} from "@/lib/ruang-belajar-shared";

/** `""` → null, `"85"` → 85, anything else → NaN (rejected before sending). */
function keNilai(teks: string): number | null {
  const isi = teks.trim();
  if (!isi) return null;
  const angka = Number(isi);
  return Number.isInteger(angka) ? angka : NaN;
}

/**
 * Grading sheet for a group task.
 *
 * Shared mode (nilaiSama): one grade box per group, written to the group's
 * content row and reported to every member. Per-member mode: one grade box per
 * member, sent as ordinary per-student rows. Both reuse the individual grade
 * action, so validation and class-scoping stay in one place.
 */
export function NilaiKelompokGrid({
  ruang,
  tugas,
  baris,
}: {
  ruang: RuangHeader;
  tugas: TugasDetail;
  baris: BarisPengumpulanKelompok[];
}) {
  const router = useRouter();
  const shared = tugas.nilaiSama;

  // Key: `g:<kelompokId>` for the shared grade, `m:<siswaId>` per member.
  const [nilai, setNilai] = useState<Record<string, number | null>>({});
  const [awal, setAwal] = useState<Record<string, number | null>>({});
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kunci = useMemo(() => {
    const k: string[] = [];
    if (shared) for (const b of baris) k.push(`g:${b.kelompokId}`);
    else for (const b of baris) for (const a of b.anggota) k.push(`m:${a.siswaId}`);
    return k;
  }, [baris, shared]);

  const petaAwal = () => {
    const p: Record<string, number | null> = {};
    for (const b of baris) {
      if (shared) p[`g:${b.kelompokId}`] = b.nilai;
      else for (const a of b.anggota) p[`m:${a.siswaId}`] = b.nilaiAnggota[a.siswaId] ?? null;
    }
    return p;
  };

  useEffect(() => {
    const segar = petaAwal();
    setAwal(segar);
    setNilai((lama) => {
      const hasil: Record<string, number | null> = {};
      for (const k of kunci) {
        hasil[k] =
          lama[k] !== undefined && lama[k] !== (awal[k] ?? null)
            ? lama[k] // unsaved local edit
            : segar[k];
      }
      return hasil;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baris]);

  function ubah(k: string, teks: string) {
    const angka = keNilai(teks);
    setNilai((lama) => ({ ...lama, [k]: Number.isNaN(angka) ? lama[k] ?? null : angka }));
    setError(null);
    setPesan(null);
  }

  const berubah = useMemo(
    () => kunci.filter((k) => (nilai[k] ?? null) !== (awal[k] ?? null)),
    [kunci, nilai, awal],
  );

  function batal() {
    setNilai({ ...awal });
    setError(null);
    setPesan(null);
  }

  function simpan() {
    if (berubah.length === 0) return;
    const potret = { ...nilai };

    startTransition(async () => {
      let entri: { siswaId: string; nilai: number | null }[] = [];
      let nilaiKelompok: { kelompokId: number; nilai: number | null }[] | undefined;

      if (shared) {
        nilaiKelompok = baris
          .filter((b) => berubah.includes(`g:${b.kelompokId}`))
          .map((b) => ({ kelompokId: b.kelompokId, nilai: nilai[`g:${b.kelompokId}`] ?? null }));
      } else {
        entri = [];
        for (const b of baris) {
          for (const a of b.anggota) {
            const k = `m:${a.siswaId}`;
            if (berubah.includes(k)) entri.push({ siswaId: a.siswaId, nilai: nilai[k] ?? null });
          }
        }
      }

      const hasil = await simpanNilaiTugasAction({
        ruangId: ruang.id,
        tugasId: tugas.id,
        entri,
        nilaiKelompok,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setAwal(potret);
      setPesan(`Nilai ${berubah.length} tersimpan.`);
      router.refresh();
    });
  }

  const sudah = baris.filter((b) => b.dikumpulkan).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" />
          <span className="tabular-nums">
            {baris.length} kelompok · {sudah} terkumpul
          </span>
        </span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="text-xs text-muted-foreground">
          {shared
            ? "Satu nilai untuk seluruh kelompok."
            : "Nilai per anggota — tiap anggota bisa berbeda."}
        </span>
      </div>

      {baris.length === 0 ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          Belum ada kelompok. Atur kelompok tugas dulu di panel di atas.
        </p>
      ) : (
        <div className="space-y-2">
          {baris.map((b) => {
            const buka = terbuka === b.kelompokId;
            const status = !b.dikumpulkan
              ? { label: "Belum", tone: "netral" as const }
              : b.nilai !== null
                ? { label: "Dinilai", tone: "biru" as const }
                : { label: "Sudah", tone: "hijau" as const };
            return (
              <div
                key={b.kelompokId}
                className="overflow-hidden rounded-xl border border-border/70 bg-card"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setTerbuka(buka ? null : b.kelompokId)}
                    aria-expanded={buka}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        buka && "rotate-180",
                      )}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {b.namaKelompok}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {b.anggota.length} anggota
                    </span>
                  </button>

                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                      TONE[status.tone],
                    )}
                  >
                    {status.label}
                  </span>

                  {b.fileUrl ? (
                    <LihatBerkasNilai
                      ruangId={ruang.id}
                      tugasId={tugas.id}
                      pengumpulan={{
                        siswaId: b.anggota[0]?.siswaId ?? "",
                        nama: b.namaKelompok,
                        nisn: null,
                        dikumpulkan: b.dikumpulkan,
                        dikumpulkanAt: b.dikumpulkanAt,
                        teks: b.teks,
                        fileUrl: b.fileUrl,
                        nilai: b.nilai,
                        terlambat: false,
                      }}
                    />
                  ) : null}

                  <HapusPengumpulan
                    ruangId={ruang.id}
                    tugasId={tugas.id}
                    siswaId={b.anggota[0]?.siswaId ?? ""}
                    nama={b.namaKelompok}
                    adaJawaban={b.dikumpulkan}
                    kelompokId={b.kelompokId}
                    boleh
                  />
                </div>

                {/* Grade inputs: one per group (shared) or one per member. */}
                <div className="border-t border-border/60 bg-muted/20 px-3 py-2">
                  {shared ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        Nilai kelompok
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        disabled={pending}
                        placeholder="—"
                        aria-label={`Nilai ${b.namaKelompok}`}
                        value={nilai[`g:${b.kelompokId}`] ?? ""}
                        onChange={(e) => ubah(`g:${b.kelompokId}`, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            simpan();
                          }
                        }}
                        className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors tabular-nums placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
                      />
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {b.anggota.map((a) => (
                        <li
                          key={a.siswaId}
                          className="flex items-center justify-between gap-3 py-1.5"
                        >
                          <span className="truncate text-sm text-foreground">
                            {a.nama}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            inputMode="numeric"
                            disabled={pending}
                            placeholder="—"
                            aria-label={`Nilai ${a.nama}`}
                            value={nilai[`m:${a.siswaId}`] ?? ""}
                            onChange={(e) => ubah(`m:${a.siswaId}`, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                simpan();
                              }
                            }}
                            className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors tabular-nums placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {buka ? (
                  <div className="border-t border-border/60 px-3 py-2.5">
                    <p className="mb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                      Jawaban {b.namaKelompok}
                      {b.dikumpulkanAt ? (
                        <span className="ml-2 normal-case">
                          {formatTanggalJam(b.dikumpulkanAt)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm whitespace-pre-line text-foreground">
                      {b.teks?.trim() || "—"}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

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
              <Button type="button" size="sm" variant="ghost" onClick={batal} disabled={pending}>
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
