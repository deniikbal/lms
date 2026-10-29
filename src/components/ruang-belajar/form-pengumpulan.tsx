"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, SendIcon } from "lucide-react";

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

/**
 * The student's answer box.
 *
 * The same `bolehKirim` rule the server uses decides whether the box is usable,
 * so the page never offers a send that the database would refuse.
 */
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
      const hasil = await kirimTugasAction({ ruangId, tugasId: tugas.id, teks });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
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
            rows={10}
            maxLength={5000}
            disabled={terkunci || pending}
            placeholder="Tulis jawaban Anda di sini…"
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground"
          />
          <p className="text-right text-[0.7rem] tabular-nums text-muted-foreground">
            {teks.length}/5000
          </p>
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
              disabled={pending || teks.trim().length === 0}
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
