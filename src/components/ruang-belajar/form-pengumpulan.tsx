"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  SendIcon,
  XIcon,
} from "lucide-react";

import { kirimTugasAction } from "@/app/actions/ruang-belajar";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  bolehKirim,
  formatTanggalJam,
  statusPengumpulan,
  type PengumpulanSiswa,
  type TugasDetail,
} from "@/lib/ruang-belajar-shared";

/** Mirrors `MIME_DIIZINKAN` in `lib/drive.ts` — the browser hint, not the rule. */
const TERIMA = "image/jpeg,image/png,image/webp,image/heic,application/pdf";
const BATAS_MB = 10;

/** The student's answer box: typed text, an uploaded photo/PDF, or both. */
export function FormPengumpulan({
  ruangId,
  tugas,
  pengumpulan,
}: {
  ruangId: number;
  tugas: TugasDetail;
  pengumpulan: PengumpulanSiswa;
}) {
  const router = useRouter();
  const [teks, setTeks] = useState(pengumpulan.teks ?? "");
  // A `File` is passed straight into the server action, so nothing is uploaded
  // to a separate route and there is no temp file to clean up.
  const [berkas, setBerkas] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const izin = bolehKirim(tugas, pengumpulan);
  const status = statusPengumpulan(pengumpulan);
  const terkunci = !izin.ok;

  function kirim() {
    setError(null);
    setPesan(null);
    startTransition(async () => {
      const hasil = await kirimTugasAction({
        ruangId,
        tugasId: tugas.id,
        teks,
        file: berkas,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setBerkas(null);
      setPesan(
        pengumpulan.dikumpulkan
          ? "Jawaban diperbarui."
          : "Tugas terkirim. Guru akan melihat jawaban Anda.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-xs">
        <span className="text-muted-foreground">Status Anda</span>
        <span
          className={cn(
            "inline-flex rounded-md px-1.5 py-0.5 font-medium ring-1",
            TONE[status.tone],
          )}
        >
          {status.label}
        </span>

        {pengumpulan.dikumpulkanAt ? (
          <span className="text-muted-foreground tabular-nums">
            · dikumpulkan {formatTanggalJam(pengumpulan.dikumpulkanAt)}
          </span>
        ) : null}

        {pengumpulan.nilai !== null ? (
          <span
            className={cn(
              "ml-auto inline-flex rounded-md px-1.5 py-0.5 font-medium ring-1 tabular-nums",
              TONE.hijau,
            )}
          >
            Nilai {pengumpulan.nilai}
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="space-y-1.5">
          <Label htmlFor="jawaban-tugas">Jawaban</Label>
          <textarea
            id="jawaban-tugas"
            value={teks}
            onChange={(event) => {
              setTeks(event.target.value);
              setError(null);
              setPesan(null);
            }}
            rows={8}
            maxLength={5000}
            disabled={terkunci || pending}
            placeholder="Tulis jawaban Anda di sini…"
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground"
          />
          <p className="text-right text-[0.7rem] tabular-nums text-muted-foreground">
            {teks.length}/5000
          </p>
        </div>

        <div className="mt-1 space-y-1.5">
          <Label htmlFor="berkas-tugas">Foto atau berkas</Label>
          <input
            id="berkas-tugas"
            type="file"
            accept={TERIMA}
            disabled={terkunci || pending}
            onChange={(event) => {
              setBerkas(event.target.files?.[0] ?? null);
              setError(null);
              setPesan(null);
            }}
            className="block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:bg-muted/40"
          />
          <p className="text-[0.7rem] text-muted-foreground">
            Foto (JPG/PNG/WebP) atau PDF, maks. {BATAS_MB} MB. Berkas disimpan di
            Google Drive; mengirim berkas baru menghapus berkas lama.
          </p>

          {berkas ? (
            <p className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground">
              <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{berkas.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {(berkas.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {!pending ? (
                <button
                  type="button"
                  onClick={() => setBerkas(null)}
                  aria-label="Batalkan berkas"
                  className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </p>
          ) : null}

          {pengumpulan.fileUrl ? (
            <a
              href={pengumpulan.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4 hover:text-primary"
            >
              <FileTextIcon className="size-3.5" />
              Berkas yang sudah Anda kirim
            </a>
          ) : null}
        </div>

        {terkunci ? (
          <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {izin.alasan}
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground" role="status">
            {pesan ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <CheckIcon className="size-3.5 text-primary" />
                {pesan}
              </span>
            ) : (
              ""
            )}
          </p>

          {!terkunci ? (
            <Button
              type="button"
              size="sm"
              onClick={kirim}
              disabled={pending || (teks.trim().length === 0 && !berkas)}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {pengumpulan.dikumpulkan ? "Perbarui jawaban" : "Kirim tugas"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
