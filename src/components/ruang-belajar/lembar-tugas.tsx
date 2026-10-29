import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";

import { NilaiTugasGrid } from "@/components/ruang-belajar/nilai-tugas-grid";
import { TONE } from "@/components/ruang-belajar/tone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  keteranganTenggat,
  labelTipe,
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
  base,
}: {
  ruang: RuangHeader;
  tugas: TugasDetail;
  pengumpulan: PengumpulanRow[];
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

          <Link
            href={`${base}?tab=tugas`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali ke tugas
          </Link>
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

      <NilaiTugasGrid
        ruangId={ruang.id}
        tugasId={tugas.id}
        pengumpulan={pengumpulan}
      />
    </div>
  );
}
