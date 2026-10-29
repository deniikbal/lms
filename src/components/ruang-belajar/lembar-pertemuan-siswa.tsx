import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  InfoIcon,
  PlayCircleIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";

import { PresensiSiswa, TombolSelesai } from "@/components/ruang-belajar/aksi-pertemuan";
import { TONE } from "@/components/ruang-belajar/tone";
import { BacaMateri } from "@/components/ruang-belajar/tulis-materi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  badgePresensi,
  bolehIsiSendiri,
  formatTanggal,
  hariDariTanggal,
  hariIni,
  keteranganJendelaSiswa,
  labelSumberPresensi,
  STATUS_PRESENSI,
  type PertemuanSiswa,
  type RuangHeader,
} from "@/lib/ruang-belajar-shared";

/** A card with a titled strip, matching the sidebar blocks on the Materi tab. */
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

/** A chip in the shared tone palette. */
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

/**
 * The meeting page a student lands on from the Materi tab.
 *
 * It exists for three things the list cannot do: show what the meeting actually
 * contains, let the student record their own attendance while the window is
 * open, and let them say they have studied it. The material is the teacher's
 * written text, plus a video link and an attachment when there are any — the
 * three are independent, so a meeting with only prose still has something to
 * show.
 */
export function LembarPertemuanSiswa({
  ruang,
  pertemuan,
  base,
}: {
  ruang: RuangHeader;
  pertemuan: PertemuanSiswa;
  /** The room URL, e.g. `/siswa/ruang/85`. */
  base: string;
}) {
  const tanggalTeks = hariIni(pertemuan.tanggal)
    ? `Hari ini · ${formatTanggal(pertemuan.tanggal)}`
    : `${hariDariTanggal(pertemuan.tanggal)}, ${formatTanggal(pertemuan.tanggal)}`;

  const status = badgePresensi(
    {
      terbit: pertemuan.terbit,
      presensiDibuka: pertemuan.presensiDibuka,
      presensiTutup: pertemuan.presensiTutup,
      presensiAda: pertemuan.statusSiswa !== null,
      statusSiswa: pertemuan.statusSiswa,
      hadir: pertemuan.hadir,
      jumlahSiswa: pertemuan.jumlahSiswa,
    },
    "siswa",
  );

  const izin = bolehIsiSendiri(pertemuan);
  const adaMateri = Boolean(pertemuan.materi?.trim());
  const adaLampiran = Boolean(pertemuan.videoUrl || pertemuan.lampiranNama);
  const adaBahan = adaMateri || adaLampiran;

  return (
    <div className="space-y-5">
      <header>
        <nav
          aria-label="Remah roti"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href="/siswa/ruang"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Ruang Belajar
          </Link>
          <ChevronRightIcon className="size-3" />
          <Link
            href={base}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {ruang.kelasNama}
          </Link>
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Pertemuan {pertemuan.urutan}</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {pertemuan.judul}
              </h1>
              <Chip tone={status.tone}>{status.label}</Chip>
              {pertemuan.selesai ? (
                <Chip tone="hijau" icon={<CheckIcon className="size-3" />}>
                  Sudah dipelajari
                </Chip>
              ) : null}
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="tabular-nums">Pertemuan {pertemuan.urutan}</span>
              <span aria-hidden>·</span>
              <span>{tanggalTeks}</span>
              <span aria-hidden>·</span>
              <span>{ruang.mapelNama}</span>
              <span aria-hidden>·</span>
              <Badge variant="secondary">{ruang.kelasNama}</Badge>
            </p>
          </div>

          <Link
            href={base}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali ke materi
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-medium text-foreground">
              <span className="text-muted-foreground">
                <FileTextIcon className="size-3.5" />
              </span>
              Bahan pertemuan
            </h2>

            {adaMateri ? (
              <div
                className={cn(
                  "px-3 py-3",
                  // A hairline only when links follow, so the two blocks read as
                  // separate kinds of material rather than one long list.
                  adaLampiran && "border-b border-border",
                )}
              >
                <BacaMateri materi={pertemuan.materi!} />
              </div>
            ) : null}

            {adaLampiran ? (
              <ul className="divide-y divide-border">
                {pertemuan.videoUrl ? (
                  <li>
                    <a
                      href={pertemuan.videoUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-blue-600/25 bg-blue-500/[0.08] text-blue-600 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400">
                        <PlayCircleIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          Video pembelajaran
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {pertemuan.videoUrl}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Tonton
                      </span>
                    </a>
                  </li>
                ) : null}

                {pertemuan.lampiranNama ? (
                  <li>
                    <a
                      href={pertemuan.lampiranUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
                        <FileTextIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {pertemuan.lampiranNama}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Lampiran
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Buka
                      </span>
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}

            {adaBahan ? null : (
              <div className="px-3 py-6 text-center">
                <FileTextIcon className="mx-auto size-5 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Guru belum menulis materi, video, atau lampiran untuk pertemuan
                  ini.
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Materinya dibahas langsung di kelas.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                {pertemuan.selesai
                  ? "Anda sudah menandai pertemuan ini selesai."
                  : adaBahan
                    ? "Sudah membaca materinya?"
                    : "Tandai kalau pertemuan ini sudah Anda ikuti."}
              </p>
              <TombolSelesai
                ruangId={ruang.id}
                pertemuanId={pertemuan.id}
                selesai={pertemuan.selesai}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-medium text-foreground">
              <span className="text-muted-foreground">
                <UserCheckIcon className="size-3.5" />
              </span>
              Presensi
            </h2>

            <div className="space-y-3 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Status Anda</span>
                {pertemuan.statusSiswa ? (
                  <Chip tone={STATUS_PRESENSI[pertemuan.statusSiswa].tone}>
                    {STATUS_PRESENSI[pertemuan.statusSiswa].label}
                  </Chip>
                ) : (
                  <Chip tone="netral">Belum ada</Chip>
                )}
                <span className="text-muted-foreground">
                  · {labelSumberPresensi(pertemuan.sumberSiswa)}
                </span>

                <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                  <UsersIcon className="size-3" />
                  {pertemuan.hadir}/{pertemuan.jumlahSiswa} hadir
                </span>
              </div>

              {/*
                Once the teacher has recorded a status, when the window was is
                history — printing it next to "Diisi guru" would repeat the same
                instruction ("ask the teacher") twice.
              */}
              {pertemuan.sumberSiswa === "guru" ? null : (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CalendarClockIcon className="mt-0.5 size-3.5 shrink-0" />
                  {keteranganJendelaSiswa(pertemuan)}
                </p>
              )}

              <PresensiSiswa
                ruangId={ruang.id}
                pertemuanId={pertemuan.id}
                status={pertemuan.statusSiswa}
                boleh={izin.ok}
                alasan={izin.ok ? null : izin.alasan}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20">
          <Kotak judul="Pertemuan lain" ikon={<InfoIcon className="size-3.5" />}>
            <div className="space-y-2">
              {pertemuan.sebelumnya ? (
                <Link
                  href={`${base}/pertemuan/${pertemuan.sebelumnya.id}`}
                  className="flex items-start gap-2 rounded-lg border border-border/70 px-2.5 py-2 transition-colors hover:bg-muted"
                >
                  <ArrowLeftIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] text-muted-foreground tabular-nums">
                      Pertemuan {pertemuan.sebelumnya.urutan}
                    </span>
                    <span className="block truncate text-xs text-foreground">
                      {pertemuan.sebelumnya.judul}
                    </span>
                  </span>
                </Link>
              ) : null}

              {pertemuan.berikutnya ? (
                <Link
                  href={`${base}/pertemuan/${pertemuan.berikutnya.id}`}
                  className="flex items-start gap-2 rounded-lg border border-border/70 px-2.5 py-2 transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.65rem] text-muted-foreground tabular-nums">
                      Pertemuan {pertemuan.berikutnya.urutan}
                    </span>
                    <span className="block truncate text-xs text-foreground">
                      {pertemuan.berikutnya.judul}
                    </span>
                  </span>
                  <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              ) : null}

              {!pertemuan.sebelumnya && !pertemuan.berikutnya ? (
                <p className="text-xs text-muted-foreground">
                  Ini satu-satunya pertemuan yang sudah terbit di ruang ini.
                </p>
              ) : null}
            </div>
          </Kotak>
        </aside>
      </div>
    </div>
  );
}
