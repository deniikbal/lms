import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, FileTextIcon, UsersIcon } from "lucide-react";

import { KelompokPanel } from "@/components/ruang-belajar/kelompok-panel";
import { NilaiKelompokGrid } from "@/components/ruang-belajar/nilai-kelompok-grid";
import { NilaiTugasGrid } from "@/components/ruang-belajar/nilai-tugas-grid";
import { TONE } from "@/components/ruang-belajar/tone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  keteranganTenggat,
  labelTipe,
  type AnggotaRow,
  type BarisPengumpulanKelompok,
  type KelompokRow,
  type PengumpulanRow,
  type RuangHeader,
  type TugasDetail,
} from "@/lib/ruang-belajar-shared";

/**
 * The teacher's view of one task: who handed it in, what they wrote, and the
 * grade. Shared by `/guru/ruang/[id]/tugas/[tugasId]` and its admin twin.
 */
export function LembarTugas({
  ruang,
  tugas,
  pengumpulan,
  kelompok,
  anggota,
  base,
}: {
  ruang: RuangHeader;
  tugas: TugasDetail;
  pengumpulan: PengumpulanRow[];
  /** Group rows — only for a group task. */
  kelompok?: BarisPengumpulanKelompok[];
  /** The class roster, for the group editor. */
  anggota?: AnggotaRow[];
  /** The room URL, e.g. `/guru/ruang/73`. */
  base: string;
}) {
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
            href={`${base}?tab=tugas`}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {ruang.kelasNama}
          </Link>
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Pengumpulan tugas</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {tugas.judul}
              </h1>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                  tugas.terbit ? TONE.hijau : TONE.kuning,
                )}
              >
                {tugas.terbit ? "Terbit" : "Draf"}
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{ruang.mapelNama}</span>
              <span aria-hidden>·</span>
              <Badge variant="secondary">{ruang.kelasNama}</Badge>
              <span aria-hidden>·</span>
              <span>{labelTipe(tugas.tipe)}</span>
            </p>

            <p className="mt-1.5 text-xs text-muted-foreground">
              {keteranganTenggat(tugas)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`${base}?tab=tugas`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeftIcon className="size-3.5" />
              Kembali ke tugas
            </Link>
          </div>
        </div>
      </header>

      {tugas.deskripsi ? (
        <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Instruksi
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-foreground">
            {tugas.deskripsi}
          </p>
        </div>
      ) : null}

      {tugas.lampiranUrl ? (
        <a
          href={tugas.lampiranUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-blue-600/25 bg-blue-500/[0.08] text-blue-600 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400">
            <FileTextIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              Lampiran tugas (PDF)
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {tugas.lampiranNama}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">Buka</span>
        </a>
      ) : null}

      {tugas.tipeKerja === "kelompok" ? (
        <>
          <KelompokPanel
            ruangId={ruang.id}
            tugasId={tugas.id}
            anggota={anggota ?? []}
            kelompok={(kelompok ?? []).map((k) => ({
              id: k.kelompokId,
              nama: k.namaKelompok,
              anggota: k.anggota.map((a) => ({ siswaId: a.siswaId, nama: a.nama })),
            }))}
          />
          <NilaiKelompokGrid
            ruang={ruang}
            tugas={tugas}
            baris={kelompok ?? []}
          />
        </>
      ) : (
        <NilaiTugasGrid
          ruangId={ruang.id}
          tugasId={tugas.id}
          pengumpulan={pengumpulan}
        />
      )}
    </div>
  );
}
