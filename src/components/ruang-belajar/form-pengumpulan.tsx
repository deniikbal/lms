"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, CheckIcon, ImageIcon, Loader2Icon, PlusIcon, SendIcon, XIcon } from "lucide-react";

import { kirimTugasAction } from "@/app/actions/ruang-belajar";
import { PratinjauBerkas } from "@/components/ruang-belajar/pratinjau-berkas";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  bolehKirim,
  formatTanggalJam,
  pecahBerkas,
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
  // `File`s pass straight into the server action: no separate upload route and
  // no temp files. The camera button is the same input with `capture`, so on a
  // phone it opens the camera directly instead of the file picker.
  const [berkas, setBerkas] = useState<{ id: number; file: File }[]>([]);
  const [berikutnya, setBerikutnya] = useState(0);
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
        files: berkas.map(({ file }) => file),
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setBerkas([]);
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
          <Label>Foto atau berkas</Label>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                (terkunci || pending) && "pointer-events-none opacity-50",
              )}
            >
              <PlusIcon className="size-3.5" />
              Pilih berkas
              <input
                type="file"
                accept={TERIMA}
                multiple
                disabled={terkunci || pending}
                onChange={(event) => {
                  const baru = Array.from(event.target.files ?? []).map((file) => ({
                    id: berikutnya,
                    file,
                  }));
                  setBerikutnya((n) => n + baru.length);
                  setBerkas((lama) => [...lama, ...baru].slice(0, 10));
                  event.target.value = "";
                  setError(null);
                  setPesan(null);
                }}
                className="hidden"
              />
            </label>

            {/*
              The capture attribute is a hint desktop browsers ignore and phones
              honour: it opens the camera straight away, no file picker hop.
            */}
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted",
                (terkunci || pending) && "pointer-events-none opacity-50",
              )}
            >
              <CameraIcon className="size-3.5" />
              Ambil foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                multiple
                disabled={terkunci || pending}
                onChange={(event) => {
                  const baru = Array.from(event.target.files ?? []).map((file) => ({
                    id: berikutnya,
                    file,
                  }));
                  setBerikutnya((n) => n + baru.length);
                  setBerkas((lama) => [...lama, ...baru].slice(0, 10));
                  event.target.value = "";
                  setError(null);
                  setPesan(null);
                }}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Foto (JPG/PNG/WebP) atau PDF, maks. {BATAS_MB} MB per berkas, maks. 10
            berkas. Tersimpan di Google Drive; mengirim ulang menggantikan semua
            berkas sebelumnya.
          </p>

          {berkas.length > 0 ? (
            <ul className="space-y-1">
              {berkas.map(({ id, file }) => (
                <li
                  key={id}
                  className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground"
                >
                  <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {!pending ? (
                    <button
                      type="button"
                      onClick={() =>
                        setBerkas((lama) => lama.filter((satu) => satu.id !== id))
                      }
                      aria-label={`Batalkan ${file.name}`}
                      className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {pengumpulan.fileUrl ? (
            <div className="space-y-1">
              <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                Berkas yang sudah Anda kirim
              </p>
              {pecahBerkas(pengumpulan.fileUrl).map((tautan, indeks, semua) => (
                <PratinjauBerkas
                  key={tautan}
                  url={tautan}
                  label={`Berkas ${indeks + 1}`}
                  berkas={{ kini: indeks + 1, total: semua.length }}
                />
              ))}
            </div>
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
              disabled={pending || (teks.trim().length === 0 && berkas.length === 0)}
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
