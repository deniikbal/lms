import Link from "next/link";
import {
  CalendarClockIcon,
  ChevronRightIcon,
  HourglassIcon,
  ListChecksIcon,
  UsersIcon,
} from "lucide-react";

import { Kosong } from "@/components/ruang-belajar/panel";
import { TONE } from "@/components/ruang-belajar/tone";
import { WARNA_KUIS } from "@/components/ruang-belajar/warna-kuis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  badgeKuis,
  badgeKuisSiswa,
  formatJendela,
  statusKuis,
  type KuisRow,
  type PeranRuang,
} from "@/lib/ruang-belajar-shared";

/**
 * The Kuis tab.
 *
 * A teacher sees every quiz, drafts included, with how many students have sat
 * it. A student sees only what has been published, with their own standing in
 * place of the class tally.
 */
export function TabKuis({
  kuis,
  peran,
  base,
}: {
  kuis: KuisRow[];
  peran: PeranRuang;
  /** The room URL, e.g. `/guru/ruang/73`. */
  base: string;
}) {
  if (kuis.length === 0) {
    return (
      <Kosong>
        {peran === "siswa"
          ? "Belum ada kuis yang diterbitkan di ruang ini."
          : "Belum ada kuis di ruang ini. Buat kuis, susun soalnya, lalu terbitkan."}
      </Kosong>
    );
  }

  return (
    <ul className="grid gap-2">
      {kuis.map((item) => (
        <KartuKuis key={item.id} item={item} peran={peran} base={base} />
      ))}
    </ul>
  );
}

function KartuKuis({
  item,
  peran,
  base,
}: {
  item: KuisRow;
  peran: PeranRuang;
  base: string;
}) {
  const status = statusKuis(item);
  const warna = WARNA_KUIS[status];
  const lencana =
    peran === "siswa" ? badgeKuisSiswa(item, item.percobaanSiswa) : badgeKuis(item);
  const jendela = formatJendela(item.mulai, item.selesai);

  return (
    <li>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          "transition-colors hover:bg-muted/20",
        )}
      >
        {/* State as a hairline on the left edge: visible in peripheral vision
            while scrolling, without repainting the whole card. */}
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", warna.garis)} />

        <div className="flex items-start gap-3 pl-4 pr-3 py-3">
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border",
              warna.kotak,
            )}
          >
            <ListChecksIcon className={cn("size-4", warna.ikon)} />
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              {/* The whole title is the target: a quiz row has one obvious
                  destination, and a chevron alone is a 12px hit area. */}
              <Link
                href={`${base}/kuis/${item.id}`}
                className="min-w-0 text-sm leading-snug font-medium text-foreground underline-offset-4 hover:underline"
              >
                <span className="line-clamp-1">{item.judul}</span>
              </Link>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                  TONE[lencana.tone],
                )}
              >
                {lencana.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ListChecksIcon className="size-3" />
                <span className="tabular-nums">{item.jumlahSoal} soal</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <HourglassIcon className="size-3" />
                <span className="tabular-nums">{item.durasiMenit} menit</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-3" />
                <span className="tabular-nums">
                  {peran === "siswa"
                    ? item.percobaanSiswa
                      ? item.percobaanSiswa.selesai
                        ? "sudah dikerjakan"
                        : "sedang dikerjakan"
                      : "belum dikerjakan"
                    : `${item.jumlahPercobaan} peserta`}
                </span>
              </span>
            </div>

            <p
              className={cn(
                "inline-flex items-center gap-1 text-[0.7rem]",
                status === "dibuka"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              <CalendarClockIcon className="size-3" />
              {jendela ?? "Tanpa jendela waktu"}
              {status === "ditutup" ? " · sudah lewat" : ""}
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground group-hover:text-foreground"
              nativeButton={false}
              render={<Link href={`${base}/kuis/${item.id}`} />}
            >
              {peran === "siswa" ? "Buka" : "Kelola"}
              <ChevronRightIcon />
            </Button>
          </span>
        </div>
      </div>
    </li>
  );
}
