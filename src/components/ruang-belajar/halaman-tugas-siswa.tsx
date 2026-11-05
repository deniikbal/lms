import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, ClipboardListIcon, FileTextIcon, InfoIcon, UsersIcon } from "lucide-react";

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
        <section
          aria-label="Instruksi tugas"
          className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-primary/[0.06] px-4 py-3.5"
        >
          {/* Garis aksen kiri — menarik pandangan tanpa warna yang mencolok. */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-primary/60"
          />
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <ClipboardListIcon className="size-4" aria-hidden />
            Instruksi tugas
          </h2>
          <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed font-medium text-foreground">
            {tugas.deskripsi}
          </p>
        </section>
      ) : null}

      {tugas.lampiranUrl ? (
        <div
          aria-label="Lampiran tugas"
          className="flex items-center gap-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/[0.07] px-4 py-3"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-600/30 bg-amber-500/15 text-amber-600 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-400">
            <FileTextIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Lampiran tugas (PDF) — wajib dibaca
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {tugas.lampiranNama}
            </span>
          </span>
          <PratinjauBerkas
            url={tugas.lampiranUrl}
            label="Buka lampiran"
            className="shrink-0 rounded-lg border border-amber-600/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-400"
          />
        </div>
      ) : null}

      {tugas.tipeKerja === "kelompok" ? (
        <section
          aria-label="Kelompok Anda"
          className="rounded-xl border border-border/70 bg-card px-4 py-3"
        >
          {pengumpulan.kelompok ? (
            <>
              <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <UsersIcon className="size-4" aria-hidden />
                {pengumpulan.kelompok.nama}
              </h2>
              <p className="mt-1.5 text-sm text-foreground">
                {pengumpulan.kelompok.anggota.map((a) => a.nama).join(", ")}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Tugas ini dikerjakan berkelompok — satu jawaban untuk seluruh
                kelompok. Siapa pun anggotanya boleh mengunggah, dan unggahan
                terakhir berlaku untuk semua.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              Anda belum masuk kelompok untuk tugas ini. Hubungi guru pengampu
              agar didaftarkan sebelum mengumpulkan.
            </p>
          )}
        </section>
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
