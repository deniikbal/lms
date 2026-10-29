import Link from "next/link";
import {
  ChevronRightIcon,
  CircleDashedIcon,
  FolderOpenIcon,
  HelpCircleIcon,
  LibraryBigIcon,
  PenLineIcon,
  PlusIcon,
  ShareIcon,
} from "lucide-react";

import { FilterTopik } from "@/components/bank-soal/filter-topik";
import { KotakAngka } from "@/components/kotak-angka";
import { warnaMapel } from "@/components/warna-mapel";
import { Kosong } from "@/components/ruang-belajar/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FilterBank,
  MapelBankOption,
  TopikRingkas,
} from "@/lib/bank-soal-shared";

/**
 * The bank's front door: topics, not questions.
 *
 * A teacher does not browse four hundred loose questions — they open the topic
 * they are about to teach, the way they would open a folder. The questions live
 * one level down, on the topic's own page, where the editor also sits: having
 * picked a topic, nothing else has to be named again.
 */
export function DaftarTopik({
  topik,
  filter,
  mapel,
  base = "/guru/bank-soal",
}: {
  topik: TopikRingkas[];
  filter: FilterBank;
  mapel: MapelBankOption[];
  base?: string;
}) {
  const terfilter =
    filter.mapelId !== null || filter.jenis !== null || filter.cari !== "";

  // Drawn as a grid for up to five topics; past that, a single column reads
  // faster than four rows of half-empty cards.
  const banyak = topik.length > 5;

  return (
    <div className="space-y-4">
      <FilterTopik base={base} filter={filter} mapel={mapel} />

      <p className="text-xs text-muted-foreground">
        {topik.length === 0
          ? "Tidak ada topik yang cocok."
          : `${topik.length} topik${terfilter ? " (terfilter)" : ""}`}
        {terfilter ? (
          <>
            {" · "}
            <Link
              href={base}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              hapus filter
            </Link>
          </>
        ) : null}
      </p>

      {topik.length === 0 ? (
        <Kosong>
          Belum ada topik. Mulai dengan membuat satu topik — misalnya{" "}
          <em>Laju Reaksi</em> — lalu isi soalnya di dalam topik itu. Satu topik
          bisa ditugaskan utuh ke kuis di kelas mana pun yang Anda ampu.
        </Kosong>
      ) : (
        <ul
          className={cn(
            "grid gap-2",
            banyak ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
          )}
        >
          {topik.map((item) => (
            <KartuTopik key={item.id} item={item} base={base} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function KepalaBank({
  total,
  pg,
  esai,
  dipakai,
  topik,
  kosong,
  /** `?mapel=` carries the subject being filtered into the new-topic form. */
  tautanBaru = "/guru/bank-soal/baru",
}: {
  total: number;
  pg: number;
  esai: number;
  dipakai: number;
  topik: number;
  kosong: number;
  tautanBaru?: string;
}) {
  return (
    <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <LibraryBigIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
            Bank Soal
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {topik === 0
              ? "Mulai dengan satu topik. Soal ditulis di dalam topik, lalu topik itu ditugaskan utuh ke kuis di kelas mana pun."
              : "Soal ditulis sekali di sini, lalu ditugaskan ke kuis di kelas mana pun."}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={tautanBaru} />}
        >
          <PlusIcon />
          Topik baru
        </Button>
      </div>

      {/*
        The counts used to be a run-on sentence. As boxes they can be scanned,
        and each one is a filter the teacher was already going to type.
      */}
      <dl className="grid gap-2 border-t border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <KotakAngka
          warna="indigo"
          ikon={<FolderOpenIcon className="size-3.5" />}
          label="Topik"
          nilai={topik}
          catatan={kosong > 0 ? `${kosong} masih kosong` : undefined}
        />
        <KotakAngka
          warna="emerald"
          ikon={<HelpCircleIcon className="size-3.5" />}
          label="Pilihan ganda"
          nilai={pg}
        />
        <KotakAngka
          warna="sky"
          ikon={<PenLineIcon className="size-3.5" />}
          label="Esai"
          nilai={esai}
        />
        <KotakAngka
          warna="violet"
          ikon={<ShareIcon className="size-3.5" />}
          label="Dipakai di kuis"
          nilai={dipakai}
        />
        <KotakAngka
          warna="amber"
          ikon={<CircleDashedIcon className="size-3.5" />}
          label="Total soal"
          nilai={total}
        />
      </dl>
    </header>
  );
}

function KartuTopik({ item, base }: { item: TopikRingkas; base: string }) {
  const kosong = item.soal === 0;
  const warna = warnaMapel(item);

  return (
    <li>
      <Link
        href={`${base}/topik/${item.id}`}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
          "hover:-translate-y-0.5 hover:shadow-md",
          kosong ? "border-dashed border-border" : "border-border",
        )}
      >
        {/* One hairline in the subject's hue: enough to tell two cards apart at
            a glance, small enough not to shout. */}
        <span aria-hidden className={cn("h-0.5 w-full shrink-0", kosong ? "bg-border" : warna.garis)} />

        <div className="flex flex-1 items-start gap-2.5 p-3">
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border",
              kosong ? "border-border bg-muted/60" : warna.kotak,
            )}
          >
            <FolderOpenIcon
              className={cn("size-4", kosong ? "text-muted-foreground/60" : warna.ikon)}
            />
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-foreground">
                {item.nama}
              </span>
              {item.mapelKode ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1 tabular-nums",
                    kosong
                      ? "bg-muted text-muted-foreground ring-border"
                      : warna.chip,
                  )}
                >
                  {item.mapelKode}
                </span>
              ) : null}
            </div>

            {kosong ? (
              <p className="text-xs text-muted-foreground">
                Belum ada soal — buka untuk mulai mengisi.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                <Chip>{item.soal} soal</Chip>
                <Chip>{item.bobot} poin</Chip>
                {item.jumlahEsai > 0 ? (
                  <Chip>
                    <PenLineIcon className="size-3" />
                    {item.jumlahEsai} esai
                  </Chip>
                ) : null}
                {item.dipakai > 0 ? (
                  <Chip>
                    <ShareIcon className="size-3" />
                    {item.dipakai} kuis
                  </Chip>
                ) : null}
              </div>
            )}
          </div>

          <ChevronRightIcon
            className={cn(
              "mt-1.5 size-4 shrink-0 transition-transform",
              "text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-foreground",
            )}
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t px-3 py-1.5 text-[0.68rem]",
            kosong
              ? "border-border bg-muted/30 text-muted-foreground"
              : "border-border/70 bg-muted/40 text-muted-foreground",
          )}
        >
          <span className="tabular-nums">
            {kosong ? "Topik kosong" : `Diperbarui ${item.diperbarui}`}
          </span>
          <span className="tabular-nums">
            {kosong ? "0 soal" : `${item.jumlahPg} PG · ${item.jumlahEsai} esai`}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Small stat pill inside a topic card. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground tabular-nums">
      {children}
    </span>
  );
}
