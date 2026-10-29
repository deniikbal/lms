"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, UndoIcon } from "lucide-react";

import { catatHadirAction, tandaiSelesaiAction } from "@/app/actions/materi-siswa";
import { TONE_PENUH } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_PRESENSI, type StatusPresensi } from "@/lib/ruang-belajar-shared";

/** What a student can claim. "Alpa" is the school's verdict, not theirs. */
const BISA_DIPILIH: StatusPresensi[] = ["hadir", "izin", "sakit"];

type Pesan = { nada: "ok" | "galat"; teks: string } | null;

function BarisPesan({ pesan }: { pesan: Pesan }) {
  return (
    <p role="status" className="min-h-4 text-xs">
      {pesan ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            pesan.nada === "galat" ? "text-destructive" : "text-foreground",
          )}
        >
          {pesan.nada === "ok" ? (
            <CheckIcon className="size-3.5 shrink-0 text-primary" />
          ) : null}
          {pesan.teks}
        </span>
      ) : null}
    </p>
  );
}

/**
 * The student's own attendance buttons.
 *
 * Pressed state is local so the click registers immediately, then follows the
 * server value once `router.refresh()` lands — otherwise the button would sit
 * unpressed for as long as the round trip takes and invite a second click.
 *
 * `boleh` comes from the same rule the action enforces; when it is false the
 * reason is printed instead of a dead control.
 */
export function PresensiSiswa({
  ruangId,
  pertemuanId,
  status,
  boleh,
  alasan,
}: {
  ruangId: number;
  pertemuanId: number;
  status: StatusPresensi | null;
  boleh: boolean;
  alasan: string | null;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [dipilih, setDipilih] = useState<StatusPresensi | null>(status);
  const [pesan, setPesan] = useState<Pesan>(null);

  useEffect(() => setDipilih(status), [status]);

  function pilih(nilai: StatusPresensi) {
    setDipilih(nilai);
    setPesan(null);
    mulai(async () => {
      const hasil = await catatHadirAction({ ruangId, pertemuanId, status: nilai });
      if (hasil.error) {
        setDipilih(status);
        setPesan({ nada: "galat", teks: hasil.error });
        return;
      }
      setPesan({
        nada: "ok",
        teks: `Presensi tercatat: ${STATUS_PRESENSI[nilai].label}.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {boleh ? (
        <div
          role="group"
          aria-label="Isi presensi Anda"
          className="flex flex-wrap gap-1.5"
        >
          {BISA_DIPILIH.map((nilai) => {
            const aktif = dipilih === nilai;
            return (
              <button
                key={nilai}
                type="button"
                aria-pressed={aktif}
                onClick={() => pilih(nilai)}
                disabled={pending}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                  aktif
                    ? cn(
                        "border-transparent",
                        TONE_PENUH[STATUS_PRESENSI[nilai].tone],
                      )
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {pending && aktif ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : null}
                {STATUS_PRESENSI[nilai].label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {alasan ?? "Presensi tidak bisa diisi sekarang."}
        </p>
      )}

      <BarisPesan pesan={pesan} />
    </div>
  );
}

/**
 * "Sudah dipelajari" — the one piece of state a student owns outright.
 *
 * A toggle rather than a one-way button: a wrong tap should cost one more tap,
 * not a message to the teacher.
 */
export function TombolSelesai({
  ruangId,
  pertemuanId,
  selesai,
}: {
  ruangId: number;
  pertemuanId: number;
  selesai: boolean;
}) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [nilai, setNilai] = useState(selesai);
  const [pesan, setPesan] = useState<Pesan>(null);

  useEffect(() => setNilai(selesai), [selesai]);

  function ubah() {
    const baru = !nilai;
    setNilai(baru);
    setPesan(null);
    mulai(async () => {
      const hasil = await tandaiSelesaiAction({ ruangId, pertemuanId, selesai: baru });
      if (hasil.error) {
        setNilai(!baru);
        setPesan({ nada: "galat", teks: hasil.error });
        return;
      }
      setPesan({
        nada: "ok",
        teks: baru
          ? "Ditandai sudah dipelajari."
          : "Tanda selesai dibatalkan.",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={ubah}
        disabled={pending}
        className={cn(
          nilai && "border-emerald-600/30 bg-emerald-500/[0.08] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
        )}
      >
        {pending ? (
          <Loader2Icon className="animate-spin" />
        ) : nilai ? (
          <UndoIcon />
        ) : (
          <CheckIcon />
        )}
        {nilai ? "Batalkan tanda selesai" : "Tandai sudah dipelajari"}
      </Button>
      <BarisPesan pesan={pesan} />
    </div>
  );
}
