import Link from "next/link";
import {
  BookOpenIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  DoorOpenIcon,
  ListChecksIcon,
  PresentationIcon,
  UsersIcon,
} from "lucide-react";

import { KotakAngka } from "@/components/kotak-angka";
import { warnaMapelSaja } from "@/components/warna-mapel";
import { cn } from "@/lib/utils";
import type { RingkasRuang } from "@/lib/ruang-belajar";

/**
 * One subject coloured once. Rooms of the same subject share a hue, which is
 * the only thing worth remembering on a list of twelve rooms.
 */
function warnaUntuk(item: RingkasRuang) {
  return warnaMapelSaja(item.mapel_kode, item.mapel_nama, item.id);
}

/**
 * One room: an identity block tinted by subject, then the counts.
 *
 * The whole card is the link — a room has one destination, so a separate
 * "buka" button would only add a target.
 */
function KartuRuang({ item, base }: { item: RingkasRuang; base: string }) {
  const warna = warnaUntuk(item);

  return (
    <Link
      href={`${base}/${item.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "transition-all hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div aria-hidden className={cn("h-0.5 w-full", warna.garis)} />

      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border",
            warna.kotak,
          )}
        >
          <DoorOpenIcon className={cn("size-5", warna.ikon)} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {item.mapel_nama ?? "Tanpa mapel"}
            </h3>
            <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-medium ring-1 tabular-nums",
                warna.chip,
              )}
            >
              {item.kelas_nama}
            </span>
            {item.mapel_kode ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground ring-1 ring-border">
                {item.mapel_kode}
              </span>
            ) : null}
          </p>

          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <UsersIcon className="size-3" />
            <span className="truncate">{item.guru_nama ?? "Belum ada guru"}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{item.siswa} siswa</span>
          </p>
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <PresentationIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="sr-only">Pertemuan</dt>
            <dd className="text-xs font-medium text-foreground tabular-nums">
              {item.pertemuan}
            </dd>
            <dd className="text-[0.65rem] text-muted-foreground">pertemuan</dd>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="sr-only">Tugas</dt>
            <dd className="text-xs font-medium text-foreground tabular-nums">
              {item.tugas}
            </dd>
            <dd className="text-[0.65rem] text-muted-foreground">tugas</dd>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ListChecksIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="sr-only">Kuis</dt>
            <dd className="text-xs font-medium text-foreground tabular-nums">
              {item.kuis}
            </dd>
            <dd className="text-[0.65rem] text-muted-foreground">kuis</dd>
          </div>
        </div>
      </dl>

      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-[0.7rem] text-muted-foreground">
        <CalendarClockIcon className="size-3 shrink-0" />
        <span className="truncate">{item.jadwal ?? "Belum ada jadwal"}</span>
      </div>
    </Link>
  );
}

/**
 * Index of rooms, shared by the teacher and student areas.
 *
 * Grouped by subject first: a teacher with twelve rooms is really teaching two
 * subjects, and the gap between groups says that without a filter control.
 */
export function DaftarRuang({
  ruang,
  base,
  kosong,
}: {
  ruang: RingkasRuang[];
  base: string;
  kosong: string;
}) {
  if (ruang.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">{kosong}</p>
      </div>
    );
  }

  // Insertion order of the query is class-then-subject; grouping keeps the
  // subject order stable instead of re-sorting by count.
  const kelompok = new Map<string, RingkasRuang[]>();
  for (const item of ruang) {
    const kunci = item.mapel_nama ?? "Tanpa mapel";
    const isi = kelompok.get(kunci);
    if (isi) isi.push(item);
    else kelompok.set(kunci, [item]);
  }

  return (
    <div className="space-y-5">
      {[...kelompok.entries()].map(([mapel, isi]) => {
        const warna = warnaUntuk(isi[0]!);
        const kode = isi[0]!.mapel_kode;

        return (
          <section key={mapel} className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden className={cn("size-2 rounded-full", warna.garis)} />
              <h2 className="text-sm font-medium text-foreground">{mapel}</h2>
              {kode ? (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                    warna.chip,
                  )}
                >
                  {kode}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground tabular-nums">
                {isi.length} kelas
              </span>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {isi.map((item) => (
                <li key={item.id}>
                  <KartuRuang item={item} base={base} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Page heading shared by both indexes.
 *
 * The counts sit in the header because they answer the first question a
 * teacher asks on this page: "how much is mine this term?"
 */
export function KepalaDaftar({
  judul,
  keterangan,
  ruang,
}: {
  judul: string;
  keterangan: string;
  /** When given, a strip of totals is rendered under the heading. */
  ruang?: RingkasRuang[];
}) {
  const jumlahMapel = new Set(ruang?.map((item) => item.mapel_nama ?? "-")).size;
  const total = ruang?.reduce(
    (jumlah, item) => ({
      kelas: jumlah.kelas + 1,
      siswa: jumlah.siswa + item.siswa,
      tugas: jumlah.tugas + item.tugas,
      kuis: jumlah.kuis + item.kuis,
    }),
    { kelas: 0, siswa: 0, tugas: 0, kuis: 0 },
  );

  return (
    <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-600/25 bg-indigo-500/[0.08] text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-400">
          <DoorOpenIcon className="size-5" />
        </span>

        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold tracking-tight text-foreground">
            {judul}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{keterangan}</p>
        </div>
      </div>

      {total && total.kelas > 0 ? (
        <dl className="grid gap-2 border-t border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <KotakAngka
            warna="indigo"
            ikon={<DoorOpenIcon className="size-3.5" />}
            label="Ruang"
            nilai={total.kelas}
            catatan={`${jumlahMapel} mapel`}
          />
          <KotakAngka
            warna="sky"
            ikon={<UsersIcon className="size-3.5" />}
            label="Siswa"
            nilai={total.siswa}
            catatan="dihitung per ruang"
          />
          <KotakAngka
            warna="amber"
            ikon={<BookOpenIcon className="size-3.5" />}
            label="Tugas"
            nilai={total.tugas}
          />
          <KotakAngka
            warna="emerald"
            ikon={<ListChecksIcon className="size-3.5" />}
            label="Kuis"
            nilai={total.kuis}
          />
        </dl>
      ) : null}
    </header>
  );
}