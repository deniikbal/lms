import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, FileTextIcon } from "lucide-react";

import { PresensiGrid } from "@/components/ruang-belajar/presensi-grid";
import { TONE } from "@/components/ruang-belajar/tone";
import { BacaMateri, TulisMateri } from "@/components/ruang-belajar/tulis-materi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatTanggal,
  hariDariTanggal,
  hariIni,
  keteranganJendela,
  type PertemuanDetail,
  type RuangHeader,
  type SiswaPresensi,
} from "@/lib/ruang-belajar-shared";

/**
 * The attendance sheet for one meeting.
 *
 * Shared by `/guru/ruang/[id]/pertemuan/[pertemuanId]` and its admin twin, so the
 * teacher and the admin see the same page whichever door they came through.
 */
export function LembarPresensi({
  ruang,
  pertemuan,
  siswa,
  base,
}: {
  ruang: RuangHeader;
  pertemuan: PertemuanDetail;
  siswa: SiswaPresensi[];
  /** The room URL, e.g. `/guru/ruang/73`. */
  base: string;
}) {
  const tanggalTeks = hariIni(pertemuan.tanggal)
    ? `Hari ini · ${formatTanggal(pertemuan.tanggal)}`
    : `${hariDariTanggal(pertemuan.tanggal)}, ${formatTanggal(pertemuan.tanggal)}`;

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
            href={`${base}?tab=materi`}
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
              {!pertemuan.terbit ? (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                    TONE.kuning,
                  )}
                >
                  Draf
                </span>
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

            <p className="mt-1.5 text-xs text-muted-foreground">
              {keteranganJendela(pertemuan)}
            </p>
          </div>

          <Link
            href={`${base}?tab=materi`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali ke materi
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-medium text-foreground">
          <span className="text-muted-foreground">
            <FileTextIcon className="size-3.5" />
          </span>
          Materi pertemuan
        </h2>

        <div className="px-3 py-3">
          {pertemuan.materi?.trim() ? (
            <BacaMateri materi={pertemuan.materi} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada materi tertulis untuk pertemuan ini. Siswa hanya melihat
              video dan lampiran — kalau keduanya juga kosong, halaman mereka
              tidak berisi apa pun.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {pertemuan.terbit
              ? "Tampil di halaman pertemuan siswa."
              : "Draf — materi baru terlihat siswa setelah pertemuan diterbitkan."}
          </p>
          <TulisMateri
            ruangId={ruang.id}
            pertemuanId={pertemuan.id}
            materi={pertemuan.materi}
          />
        </div>
      </section>

      <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Presensi manual oleh guru. Yang Anda simpan di sini menggantikan status
        yang diisi siswa sendiri, dan langsung ikut menghitung bobot kehadiran.
      </p>

      <PresensiGrid ruangId={ruang.id} pertemuanId={pertemuan.id} siswa={siswa} />
    </div>
  );
}
