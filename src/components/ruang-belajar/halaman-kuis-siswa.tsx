import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, ClockIcon, ListChecksIcon } from "lucide-react";

import { TombolMulaiKuis } from "@/components/ruang-belajar/tombol-mulai-kuis";
import { TONE } from "@/components/ruang-belajar/tone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  badgeKuisSiswa,
  bolehKerjakan,
  formatTanggalJam,
  keteranganKuis,
  type KuisDetail,
  type RuangHeader,
} from "@/lib/ruang-belajar-shared";

/**
 * The student's view of one quiz before they start: what it is, when it runs,
 * and what they already got.
 *
 * A score is only shown when the teacher chose to show it; the grade is still
 * recorded either way.
 */
export function HalamanKuisSiswa({
  ruang,
  kuis,
  percobaan,
  base,
}: {
  ruang: RuangHeader;
  kuis: KuisDetail;
  percobaan: { selesai: boolean; nilai: number | null; dikumpulkan: string | null } | null;
  /** The student's room URL, e.g. `/siswa/ruang/73`. */
  base: string;
}) {
  const status = badgeKuisSiswa(kuis, percobaan);
  const izin = bolehKerjakan(kuis, percobaan ? { selesai: percobaan.selesai } : null);
  const sedangBerjalan = percobaan !== null && !percobaan.selesai;

  return (
    <div className="space-y-5">
      <header>
        <nav
          aria-label="Remah roti"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href={base}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Ruang Belajar
          </Link>
          <ChevronRightIcon className="size-3" />
          <Link
            href={`${base}?tab=kuis`}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {ruang.kelasNama}
          </Link>
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Kuis</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {kuis.judul}
              </h1>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                  TONE[status.tone],
                )}
              >
                {status.label}
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{ruang.mapelNama}</span>
              <span aria-hidden>·</span>
              <Badge variant="secondary">{ruang.kelasNama}</Badge>
            </p>

            <p className="mt-1.5 text-xs text-muted-foreground">{keteranganKuis(kuis)}</p>
          </div>

          <Link
            href={`${base}?tab=kuis`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali ke kuis
          </Link>
        </div>
      </header>

      {kuis.petunjuk ? (
        <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Petunjuk
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-foreground">{kuis.petunjuk}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ListChecksIcon className="size-3.5" />
          <span className="tabular-nums">{kuis.jumlahSoal} soal</span>
        </span>
        <span aria-hidden className="text-muted-foreground/40">·</span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ClockIcon className="size-3.5" />
          <span className="tabular-nums">{kuis.durasiMenit} menit</span>
        </span>

        {percobaan?.dikumpulkan ? (
          <>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground tabular-nums">
              dikumpulkan {formatTanggalJam(percobaan.dikumpulkan)}
            </span>
          </>
        ) : null}

        {percobaan?.selesai && percobaan.nilai !== null ? (
          <span
            className={cn(
              "ml-auto rounded-md px-1.5 py-0.5 font-medium ring-1 tabular-nums",
              kuis.tampilkanNilai ? TONE.hijau : TONE.netral,
            )}
          >
            {kuis.tampilkanNilai ? `Nilai ${percobaan.nilai}` : "Sudah dinilai"}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        {izin.ok ? (
          <>
            <p className="text-sm text-foreground">
              {sedangBerjalan
                ? "Anda sudah mulai mengerjakan. Waktu tetap berjalan selama halaman ini ditutup."
                : "Kuis siap dikerjakan. Waktu mulai berjalan begitu Anda menekan tombol di bawah."}
            </p>
            <TombolMulaiKuis
              ruangId={ruang.id}
              kuisId={kuis.id}
              alamatKerjakan={`${base}/kuis/${kuis.id}/kerjakan`}
              label={sedangBerjalan ? "Lanjutkan mengerjakan" : "Mulai kuis"}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-foreground">{izin.alasan}</p>
            {percobaan?.selesai ? (
              <p className="text-xs text-muted-foreground">
                {percobaan.nilai === null
                  ? "Jawaban esai Anda sedang dikoreksi guru."
                  : kuis.tampilkanNilai
                    ? `Nilai Anda ${percobaan.nilai}.`
                    : "Guru menyembunyikan nilai kuis ini di layar siswa."}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
