import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, FileTextIcon, InfoIcon } from "lucide-react";

import { FormPengumpulan } from "@/components/ruang-belajar/form-pengumpulan";
import { PratinjauBerkas } from "@/components/ruang-belajar/pratinjau-berkas";
import { TONE } from "@/components/ruang-belajar/tone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  keteranganTenggat,
  labelTipe,
  type PengumpulanSiswa,
  type RuangHeader,
  type TugasDetail,
} from "@/lib/ruang-belajar-shared";

/** The student's page for one task: the brief, and the box to hand it in. */
export function HalamanTugasSiswa({
  ruang,
  tugas,
  pengumpulan,
  base,
}: {
  ruang: RuangHeader;
  tugas: TugasDetail;
  pengumpulan: PengumpulanSiswa;
  /** The room URL, e.g. `/siswa/ruang/73`. */
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
          <span className="text-foreground">Tugas</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {tugas.judul}
            </h1>

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

      {tugas.lampiranUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5">
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
          <PratinjauBerkas
            url={tugas.lampiranUrl}
            label="Buka"
            className="shrink-0 text-xs"
          />
        </div>
      ) : null}

      {tugas.tipe !== "teks" ? (
        <p
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs ring-1",
            TONE.biru,
          )}
        >
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Tugas ini menerima berkas: foto hasil kerja (JPG/PNG/WebP) atau PDF,
            maks. 10 MB. Berkas tersimpan di Google Drive sekolah dan ikut
            terkirim bersama teks jawaban Anda.
          </span>
        </p>
      ) : null}

      <FormPengumpulan
        ruangId={ruang.id}
        tugas={tugas}
        pengumpulan={pengumpulan}
      />
    </div>
  );
}
