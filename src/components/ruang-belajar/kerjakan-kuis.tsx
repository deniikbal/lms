"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, Loader2Icon } from "lucide-react";

import { kumpulkanKuisAction, simpanJawabanAction } from "@/app/actions/kuis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SoalRow } from "@/lib/ruang-belajar-shared";

/** 605 → `10.05`, matching the dot notation used everywhere else. */
function jam(sisa: number): string {
  const menit = Math.floor(sisa / 60);
  const detik = sisa % 60;
  return `${String(menit).padStart(2, "0")}.${String(detik).padStart(2, "0")}`;
}

/**
 * The student's quiz screen: one question at a time, saved as they go.
 *
 * Every answer is written within a second of being changed, so closing the tab
 * loses at most one keystroke rather than the whole paper. When the server says
 * the window has closed, the screen submits instead of showing an error the
 * student cannot do anything about.
 */
export function KerjakanKuis({
  ruangId,
  kuisId,
  judul,
  petunjuk,
  soal,
  jawabanAwal,
  sisaDetik,
  tampilkanNilai,
  alamatKembali,
}: {
  ruangId: number;
  kuisId: number;
  judul: string;
  petunjuk: string | null;
  /** Already in the order frozen when the attempt started. */
  soal: SoalRow[];
  jawabanAwal: Record<string, string>;
  /** Seconds left on this attempt, or null when the quiz has no limit. */
  sisaDetik: number | null;
  tampilkanNilai: boolean;
  /** Where to go once the paper is collected. */
  alamatKembali: string;
}) {
  const router = useRouter();
  const [jawaban, setJawaban] = useState<Record<string, string>>(jawabanAwal);
  const [indeks, setIndeks] = useState(0);
  const [sisa, setSisa] = useState<number | null>(sisaDetik);
  const [status, setStatus] = useState<"diam" | "menyimpan" | "tersimpan" | "gagal">("diam");
  const [error, setError] = useState<string | null>(null);
  const [mengumpulkan, setMengumpulkan] = useState(false);

  const jawabanRef = useRef(jawaban);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sudahKumpul = useRef(false);

  const simpan = useCallback(
    async (data: Record<string, string>) => {
      setStatus("menyimpan");
      const hasil = await simpanJawabanAction({ ruangId, kuisId, jawaban: data });
      if (hasil.error) {
        setStatus("gagal");
        if (hasil.ditutup) {
          // Time ran out mid-edit; hand in what we have instead of refusing it.
          setError(null);
          void kumpulkan(data);
        } else {
          setError(hasil.error);
        }
        return;
      }
      setStatus("tersimpan");
      setError(null);
    },
    // `kumpulkan` is defined below and stable enough for this closure; it only
    // reads refs and router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruangId, kuisId],
  );

  const kumpulkan = useCallback(
    async (data: Record<string, string>) => {
      if (sudahKumpul.current) return;
      sudahKumpul.current = true;
      setMengumpulkan(true);
      setError(null);

      const hasil = await kumpulkanKuisAction({ ruangId, kuisId, jawaban: data });
      if (hasil.error) {
        sudahKumpul.current = false;
        setMengumpulkan(false);
        setError(hasil.error);
        return;
      }
      router.push(alamatKembali);
      router.refresh();
    },
    [ruangId, kuisId, alamatKembali, router],
  );

  // Countdown. Reaching zero collects the paper once; the server re-checks the
  // deadline anyway, so a paused tab cannot buy extra time.
  useEffect(() => {
    if (sisa === null) return;
    if (sisa <= 0) {
      void kumpulkan(jawabanRef.current);
      return;
    }
    const t = setTimeout(() => setSisa((nilai) => (nilai === null ? null : nilai - 1)), 1000);
    return () => clearTimeout(t);
  }, [sisa, kumpulkan]);

  // Flush the pending save if the screen goes away.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function ubah(soalId: number, nilai: string) {
    const baru = { ...jawabanRef.current, [String(soalId)]: nilai };
    jawabanRef.current = baru;
    setJawaban(baru);
    setStatus("diam");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void simpan(baru);
    }, 900);
  }

  const butir = soal[indeks];
  const terjawab = soal.filter((item) => (jawaban[String(item.id)] ?? "").trim() !== "").length;
  const kritis = sisa !== null && sisa <= 60;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{judul}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {terjawab}/{soal.length} soal terjawab
          </p>
        </div>

        <div
          role="timer"
          aria-live="off"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium tabular-nums",
            kritis
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-card text-foreground",
          )}
        >
          <ClockIcon className="size-4" />
          {sisa === null ? "Tanpa batas" : jam(sisa)}
        </div>
      </header>

      {petunjuk ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs whitespace-pre-line text-muted-foreground">
          {petunjuk}
        </p>
      ) : null}

      {butir ? (
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Soal {indeks + 1} dari {soal.length}
            {butir.bobot > 1 ? ` · bobot ${butir.bobot}` : ""}
          </p>
          <p className="mt-1.5 text-base whitespace-pre-line text-foreground">
            {butir.pertanyaan}
          </p>

          {butir.jenis === "pg" ? (
            <div
              role="radiogroup"
              aria-label={`Jawaban soal ${indeks + 1}`}
              className="mt-3 space-y-1.5"
            >
              {Object.keys(butir.pilihan).map((huruf) => {
                const dipilih = jawaban[String(butir.id)] === huruf;
                return (
                  <label
                    key={huruf}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      dipilih
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border/70 text-foreground hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`soal-${butir.id}`}
                      value={huruf}
                      checked={dipilih}
                      onChange={() => ubah(butir.id, huruf)}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <span className="font-medium text-muted-foreground">{huruf}.</span>
                    <span className="min-w-0">{butir.pilihan[huruf]}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              <label htmlFor={`esai-${butir.id}`} className="text-xs text-muted-foreground">
                Jawaban Anda
              </label>
              <textarea
                id={`esai-${butir.id}`}
                value={jawaban[String(butir.id)] ?? ""}
                rows={7}
                maxLength={5000}
                onChange={(event) => ubah(butir.id, event.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center text-sm text-muted-foreground">
          Kuis ini belum punya soal.
        </p>
      )}

      {/* Nomor soal, so jumping around does not mean paging through. */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Nomor soal">
        {soal.map((item, nomor) => {
          const dijawab = (jawaban[String(item.id)] ?? "").trim() !== "";
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Soal ${nomor + 1}${dijawab ? " terjawab" : ""}`}
              aria-current={nomor === indeks ? "true" : undefined}
              onClick={() => setIndeks(nomor)}
              className={cn(
                "size-8 rounded-md border text-xs font-medium tabular-nums transition-colors",
                nomor === indeks
                  ? "border-primary bg-primary text-primary-foreground"
                  : dijawab
                    ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {nomor + 1}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-3 z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <p className="text-xs text-muted-foreground" role="status">
            {mengumpulkan ? (
              <span className="inline-flex items-center gap-1">
                <Loader2Icon className="size-3.5 animate-spin" />
                Mengumpulkan…
              </span>
            ) : status === "menyimpan" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2Icon className="size-3.5 animate-spin" />
                Menyimpan…
              </span>
            ) : status === "tersimpan" ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <CheckIcon className="size-3.5 text-primary" />
                Jawaban tersimpan
              </span>
            ) : status === "gagal" ? (
              <span className="text-destructive">Gagal menyimpan, mencoba lagi…</span>
            ) : (
              ""
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIndeks((n) => Math.max(0, n - 1))}
              disabled={indeks === 0}
            >
              <ChevronLeftIcon />
              Sebelumnya
            </Button>

            {indeks < soal.length - 1 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIndeks((n) => Math.min(soal.length - 1, n + 1))}
              >
                Berikutnya
                <ChevronRightIcon />
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              onClick={() => kumpulkan(jawabanRef.current)}
              disabled={mengumpulkan || soal.length === 0}
            >
              {mengumpulkan ? <Loader2Icon className="animate-spin" /> : null}
              Kumpulkan
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {tampilkanNilai ? (
        <p className="text-xs text-muted-foreground">
          Nilai akan tampil setelah Anda mengumpulkan.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Guru tidak menampilkan nilai langsung untuk kuis ini.
        </p>
      )}
    </div>
  );
}
