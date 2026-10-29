import Link from "next/link";
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ListVideoIcon,
  PaperclipIcon,
  StickyNoteIcon,
  VideoIcon,
} from "lucide-react";

import { TONE } from "@/components/ruang-belajar/tone";
import { cn } from "@/lib/utils";
import {
  badgePresensi,
  formatTanggal,
  hariDariTanggal,
  hariIni,
  namaHari,
  type Badge,
  type PeranRuang,
  type PertemuanRow,
  type RuangHeader,
} from "@/lib/ruang-belajar-shared";

/**
 * Left edge of a meeting card.
 *
 * Two states only: a draft is invisible to students, so it earns the amber; a
 * published meeting is neutral-emerald. Anything finer (hadir, presensi open)
 * already has a badge inside the card and does not need a second encoding.
 */
const GARIS_TERBIT = {
  terbit: "bg-emerald-500",
  draf: "bg-amber-500",
} as const;

/** One badge with the shared tone palette. */
function Chip({
  tone,
  children,
  icon,
}: {
  tone: keyof typeof TONE;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
        TONE[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** A sidebar block with a title strip, matching the cards on the rest of the page. */
function Kotak({
  judul,
  ikon,
  children,
}: {
  judul: string;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-medium text-foreground">
        <span className="text-muted-foreground">{ikon}</span>
        {judul}
      </h2>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

export function TabMateri({
  ruang,
  pertemuan,
  peran,
  base,
}: {
  ruang: RuangHeader;
  pertemuan: PertemuanRow[];
  peran: PeranRuang;
  /** The room URL, used to build the per-meeting link. */
  base: string;
}) {
  const draf = pertemuan.filter((item) => !item.terbit).length;
  const totalSelesai = pertemuan.reduce((jumlah, item) => jumlah + item.jumlahSelesai, 0);
  const sudahDipelajari = pertemuan.filter((item) => item.selesai).length;

  return (
    <div className="space-y-3">
      {/*
        The heading spans both columns so the list and the sidebar start on the
        same line. While it lived inside the left column, the sidebar's first
        card floated up beside the heading instead of beside the first meeting.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Materi</h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground tabular-nums ring-1 ring-border">
            {pertemuan.length} pertemuan
          </span>
        </div>

        {/*
          A teacher's number is the class's; a student's is their own. Showing a
          student the class tally would answer a question they did not ask.
        */}
        <p className="text-xs text-muted-foreground tabular-nums">
          {peran === "siswa" ? (
            <>
              {sudahDipelajari} dari {pertemuan.length} sudah dipelajari
            </>
          ) : (
            <>
              {draf > 0 ? `${draf} draf · ` : ""}
              {totalSelesai} tanda selesai
            </>
          )}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2">
          {pertemuan.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <ListVideoIcon className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                {peran === "siswa"
                  ? "Guru belum menerbitkan pertemuan apa pun."
                  : "Belum ada pertemuan. Tambahkan lewat tombol + Pertemuan di atas."}
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {pertemuan.map((item) => (
                <li key={item.id}>
                  <KartuPertemuan
                    pertemuan={item}
                    peran={peran}
                    jumlahSiswa={ruang.jumlahSiswa}
                    base={base}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20">
          {ruang.deskripsi ? (
            <Kotak judul="Catatan guru" ikon={<StickyNoteIcon className="size-3.5" />}>
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {ruang.deskripsi}
              </p>
            </Kotak>
          ) : null}

          <Kotak judul="Jadwal kelas daring" ikon={<CalendarClockIcon className="size-3.5" />}>
            {ruang.jadwal.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada jadwal untuk ruang ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {ruang.jadwal.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{namaHari(slot.hari)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {slot.jamMulai}–{slot.jamSelesai}
                      </p>
                    </div>
                    {slot.linkMeet ? (
                      <a
                        href={slot.linkMeet}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                      >
                        <VideoIcon className="size-3" />
                        Gabung
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Tanpa link
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Kotak>
        </aside>
      </div>
    </div>
  );
}

function KartuPertemuan({
  pertemuan,
  peran,
  jumlahSiswa,
  base,
}: {
  pertemuan: PertemuanRow;
  peran: PeranRuang;
  jumlahSiswa: number;
  base: string;
}) {
  const presensi = badgePresensi(
    {
      terbit: pertemuan.terbit,
      presensiDibuka: pertemuan.presensiDibuka,
      presensiTutup: pertemuan.presensiTutup,
      presensiAda: pertemuan.presensiAda,
      statusSiswa: pertemuan.statusSiswa,
      hadir: pertemuan.hadir,
      jumlahSiswa,
    },
    peran,
  );

  const tanggalTeks = hariIni(pertemuan.tanggal)
    ? `Hari ini · ${formatTanggal(pertemuan.tanggal)}`
    : `${hariDariTanggal(pertemuan.tanggal)}, ${formatTanggal(pertemuan.tanggal)}`;

  // Both roles have somewhere to go: the teacher to the attendance sheet, the
  // student to the material. Leaving the student's card plain would show them a
  // list of lessons they cannot open.
  const href = `${base}/pertemuan/${pertemuan.id}`;
  // A meeting the student has already marked is dimmed rather than hidden —
  // "done" is worth seeing at a glance without losing the ability to re-read it.
  const redup = peran === "siswa" && pertemuan.selesai;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[box-shadow,opacity] hover:shadow-md",
        redup && "opacity-70 hover:opacity-100",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          pertemuan.terbit ? GARIS_TERBIT.terbit : GARIS_TERBIT.draf,
        )}
      />

      <div className="flex items-start gap-3 py-3 pr-3 pl-3.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[0.7rem] font-medium text-muted-foreground tabular-nums">
          {String(pertemuan.urutan).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-medium text-foreground">
              {/*
                The pseudo-element stretches the link over the whole card, so a
                click anywhere opens the meeting without nesting <a> in <a>. The
                video and attachment chips carry `relative` to sit above it.
              */}
              <Link
                href={href}
                className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {pertemuan.judul}
              </Link>
            </h3>

            <ChevronRightIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
            />
          </div>

          <p
            className={cn(
              "mt-0.5 text-xs",
              hariIni(pertemuan.tanggal)
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {tanggalTeks}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!pertemuan.terbit ? <Chip tone="kuning">Draf</Chip> : null}

            {pertemuan.videoUrl ? (
              <a
                href={pertemuan.videoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 transition-colors hover:brightness-95",
                  TONE.biru,
                )}
              >
                <VideoIcon className="size-3" />
                Video
              </a>
            ) : null}

            {pertemuan.lampiranNama ? (
              <a
                href={pertemuan.lampiranUrl ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "relative inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 transition-colors hover:brightness-95",
                  TONE.netral,
                )}
              >
                <PaperclipIcon className="size-3 shrink-0" />
                <span className="truncate">{pertemuan.lampiranNama}</span>
              </a>
            ) : null}

            {peran === "siswa" && pertemuan.selesai ? (
              <Chip tone="hijau" icon={<CheckIcon className="size-3" />}>
                Sudah dipelajari
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        The numbers live in a footer instead of the badge row: attendance is a
        count, not a label, and a teacher scanning for "which meeting has nobody
        recorded" needs it aligned in the same place on every card.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 py-1.5 pr-3 pl-3.5">
        <Chip tone={presensi.tone}>{presensi.label}</Chip>

        {pertemuan.jumlahSelesai > 0 ? (
          <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground tabular-nums">
            <ClipboardCheckIcon className="size-3" />
            {pertemuan.jumlahSelesai} selesai
          </span>
        ) : null}
      </div>
    </article>
  );
}