import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  InfoIcon,
  ListChecksIcon,
  PencilIcon,
  PercentIcon,
  TargetIcon,
  TimerIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";

import { KotakAngka } from "@/components/kotak-angka";
import { TabelHasil } from "@/components/ruang-belajar/tabel-hasil";
import { TONE } from "@/components/ruang-belajar/tone";
import { WARNA_KUIS } from "@/components/ruang-belajar/warna-kuis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  analisisButir,
  badgeKuis,
  formatJendela,
  keteranganKuis,
  labelJenisSoal,
  statusKuis,
  type KuisDetail,
  type PercobaanRow,
  type RuangHeader,
  type SoalRow,
} from "@/lib/ruang-belajar-shared";

/**
 * The teacher's view of one quiz: who has sat it, what they scored, and which
 * questions the class got wrong.
 *
 * Shared by `/guru/ruang/[id]/kuis/[kuisId]` and its admin twin.
 */
export function LembarHasilKuis({
  ruang,
  kuis,
  soal,
  percobaan,
  jawaban,
  nilaiEsai,
  base,
}: {
  ruang: RuangHeader;
  kuis: KuisDetail;
  soal: SoalRow[];
  percobaan: PercobaanRow[];
  /** `jawaban[siswaId][soalId]` */
  jawaban: Record<string, Record<string, string>>;
  /** `nilaiEsai[siswaId][soalId]` */
  nilaiEsai: Record<string, Record<string, number>>;
  /** The room URL, e.g. `/guru/ruang/73`. */
  base: string;
}) {
  const status = statusKuis(kuis);
  const warna = WARNA_KUIS[status];
  const lencana = badgeKuis(kuis);

  const mengumpulkan = percobaan.filter((row) => row.selesai).length;
  const dinilai = percobaan.filter((row) => row.nilai !== null).length;
  const perluKoreksi = percobaan.filter((row) => row.perluKoreksi > 0).length;

  const angka = percobaan
    .map((row) => row.nilai)
    .filter((nilai): nilai is number => nilai !== null);
  const rata =
    angka.length === 0
      ? null
      : Math.round((angka.reduce((a, b) => a + b, 0) / angka.length) * 10) / 10;
  const tuntas = angka.filter((nilai) => nilai >= ruang.kkm).length;

  const soalEsai = soal.filter((butir) => butir.jenis === "esai");
  const butir = analisisButir(soal, Object.values(jawaban).map((isi) => ({ jawaban: isi })));

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
        <span className="text-foreground">Hasil kuis</span>
      </nav>

      {/*
        Same shape as the room card and the topic card: a tinted identity block,
        a strip of counts, then the actions. One quiz page should not invent a
        fourth layout for the same information.
      */}
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
              <ListChecksIcon className={cn("size-5", warna.ikon)} />
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

              <p className="text-sm text-muted-foreground">
                {ruang.mapelNama} · {kuis.jumlahSoal} soal · bobot {kuis.totalBobot}
              </p>

              <p
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  status === "dibuka"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                <CalendarClockIcon className="size-3" />
                {formatJendela(kuis.mulai, kuis.selesai) ?? "Tanpa jendela waktu"}
                <span aria-hidden>·</span>
                <TimerIcon className="size-3" />
                {kuis.durasiMenit} menit
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="sm" nativeButton={false} render={<Link href={`${base}/kuis/${kuis.id}/ubah`} />}>
              <PencilIcon />
              Ubah kuis
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`${base}?tab=kuis`} />}
            >
              <ArrowLeftIcon />
              Kembali
            </Button>
          </div>
        </div>

        <dl className="grid gap-2 border-t border-border bg-muted/40 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <KotakAngka
            warna="indigo"
            ikon={<UsersIcon className="size-3.5" />}
            label="Peserta"
            nilai={percobaan.length}
          />
          <KotakAngka
            warna="sky"
            ikon={<ClipboardListIcon className="size-3.5" />}
            label="Mengumpulkan"
            nilai={mengumpulkan}
          />
          <KotakAngka
            warna="emerald"
            ikon={<CheckCheckIcon className="size-3.5" />}
            label="Dinilai"
            nilai={dinilai}
          />
          <KotakAngka
            warna="violet"
            ikon={<PercentIcon className="size-3.5" />}
            label="Rata-rata"
            nilai={rata ?? "—"}
          />
          <KotakAngka
            warna="amber"
            ikon={<TargetIcon className="size-3.5" />}
            label="Tuntas KKM"
            nilai={`${tuntas}/${angka.length}`}
            catatan={`KKM ${ruang.kkm}`}
          />
          <KotakAngka
            warna="rose"
            ikon={<TriangleAlertIcon className="size-3.5" />}
            label="Perlu koreksi"
            nilai={perluKoreksi}
            catatan={perluKoreksi === 0 ? "bersih" : "esai"}
          />
        </dl>
      </header>

      {!kuis.terbit ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-600/30 bg-amber-500/[0.08] px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <InfoIcon className="mt-px size-3.5 shrink-0" />
          <span>
            Kuis masih draf: tidak muncul di tab siswa dan tidak dihitung di rapor.
          </span>
        </p>
      ) : null}

      {kuis.petunjuk ? (
        <blockquote className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Petunjuk untuk siswa
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-foreground">{kuis.petunjuk}</p>
        </blockquote>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Peserta</h2>
          <p className="text-xs text-muted-foreground">{keteranganKuis(kuis)}</p>
        </div>

        {percobaan.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada siswa yang mengerjakan kuis ini.
            </p>
          </div>
        ) : (
          <TabelHasil
            ruangId={ruang.id}
            kuisId={kuis.id}
            percobaan={percobaan}
            soalEsai={soalEsai}
            jawaban={jawaban}
            nilaiEsai={nilaiEsai}
          />
        )}
      </section>

      {butir.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Analisis butir</h2>
            <p className="text-xs text-muted-foreground">
              Persen benar dihitung dari siswa yang menjawab
            </p>
          </div>

          <ul className="space-y-2">
            {butir.map((item) => {
              const lemah = item.jenis === "pg" && item.persenBenar < 40;
              return (
                <li
                  key={item.soalId}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums",
                        item.jenis === "esai"
                          ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          : lemah
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {item.urutan}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 text-sm text-foreground">{item.pertanyaan}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1 tabular-nums",
                            item.jenis === "esai"
                              ? TONE.netral
                              : lemah
                                ? TONE.merah
                                : TONE.hijau,
                          )}
                        >
                          {item.jenis === "esai" ? "Esai" : `${item.persenBenar}% benar`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                          {labelJenisSoal(item.jenis)}
                        </span>

                        {item.jenis === "pg" ? (
                          <>
                            <span className="flex min-w-28 flex-1 items-center gap-2">
                              <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted">
                                <span
                                  className={cn(
                                    "block h-full rounded-full",
                                    lemah ? "bg-destructive" : "bg-emerald-600 dark:bg-emerald-500",
                                  )}
                                  style={{ width: `${item.persenBenar}%` }}
                                />
                              </span>
                              <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                                {item.benar}/{item.menjawab} benar
                              </span>
                            </span>

                            {item.sebaran.length > 0 ? (
                              <span className="flex flex-wrap items-center gap-1">
                                {item.sebaran.map((opsi) => (
                                  <span
                                    key={opsi.opsi}
                                    className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums"
                                  >
                                    {opsi.opsi}: {opsi.jumlah}
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                            {item.menjawab} menjawab · dikoreksi manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}