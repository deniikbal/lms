import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  ListChecksIcon,
  PencilIcon,
  TimerIcon,
} from "lucide-react";

import { FormPengaturanKuis } from "@/components/ruang-belajar/form-pengaturan-kuis";
import { PenyusunSoal } from "@/components/ruang-belajar/penyusun-soal";
import { TONE } from "@/components/ruang-belajar/tone";
import { WARNA_KUIS } from "@/components/ruang-belajar/warna-kuis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MapelBankOption } from "@/lib/bank-soal-shared";
import {
  badgeKuis,
  formatJendela,
  statusKuis,
  type KuisDetail,
  type RuangHeader,
  type SoalRow,
} from "@/lib/ruang-belajar-shared";

/**
 * The quiz editor: questions on the left, settings on the right.
 *
 * Shared by `/guru/ruang/[id]/kuis/[kuisId]/ubah` and its admin twin.
 */
export function LembarKuis({
  ruang,
  kuis,
  soal,
  adaPercobaan,
  base,
  mapel,
  mapelId,
}: {
  ruang: RuangHeader;
  kuis: KuisDetail;
  soal: SoalRow[];
  /** Somebody has already sat this quiz, so edits re-score their answers. */
  adaPercobaan: boolean;
  /** The room URL, e.g. `/guru/ruang/73`. */
  base: string;
  /** Subjects the room owner keeps a bank for. */
  mapel: MapelBankOption[];
  /** The room's own subject. */
  mapelId: number | null;
}) {
  const status = statusKuis(kuis);
  const warna = WARNA_KUIS[status];
  const lencana = badgeKuis(kuis);
  const jendela = formatJendela(kuis.mulai, kuis.selesai);

  return (
    <div className="space-y-4">
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
        <Link
          href={`${base}/kuis/${kuis.id}`}
          className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {kuis.judul}
        </Link>
        <ChevronRightIcon className="size-3" />
        <span className="text-foreground">Ubah</span>
      </nav>

      {/* Same identity block as the results page, with the status tint carried
          over from the quiz list — one quiz looks the same wherever it appears. */}
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div aria-hidden className={cn("h-0.5 w-full", warna.garis)} />

        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border",
                warna.kotak,
              )}
            >
              <PencilIcon className={cn("size-5", warna.ikon)} />
            </span>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg leading-tight font-semibold tracking-tight text-foreground">
                  {kuis.judul}
                </h1>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                    TONE[lencana.tone],
                  )}
                >
                  {lencana.label}
                </span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground tabular-nums ring-1 ring-border">
                  {ruang.kelasNama}
                </span>
              </div>

              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{ruang.mapelNama}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <ListChecksIcon className="size-3" />
                  {soal.length} soal
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <TimerIcon className="size-3" />
                  {kuis.durasiMenit} menit
                </span>
              </p>

              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClockIcon className="size-3" />
                {jendela ?? "Tanpa jendela waktu"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`${base}/kuis/${kuis.id}`} />}
          >
            <ArrowLeftIcon />
            Lihat hasil
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PenyusunSoal
          ruangId={ruang.id}
          kuisId={kuis.id}
          soal={soal}
          adaPercobaan={adaPercobaan}
          mapel={mapel}
          mapelId={mapelId}
        />

        <div className="lg:sticky lg:top-20">
          <FormPengaturanKuis kuis={kuis} base={base} />
        </div>
      </div>
    </div>
  );
}