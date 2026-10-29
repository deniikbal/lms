"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";

import { imporBankSoalAction } from "@/app/actions/bank-soal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TopikRingkas } from "@/lib/bank-soal-shared";
import { labelJenisSoal, parseSoalTeks } from "@/lib/ruang-belajar-shared";

const CONTOH = `1. Ibu kota Provinsi Jawa Barat adalah…
A. Bandung
B. Semarang
C. Surabaya
D. Medan
Kunci: A

2. Jelaskan perbedaan pasar tradisional dan pasar modern.
Bobot: 10`;

/**
 * Bulk entry from pasted text — the same format the quiz editor accepts.
 *
 * The preview runs the very parser the server action runs, so what the teacher
 * sees counted here is what gets written. Without it, a misplaced blank line
 * would only be discovered by importing and counting the result.
 */
export function ImporBankTeks({ topik }: { topik: TopikRingkas }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const pratinjau = useMemo(
    () => (teks.trim() ? parseSoalTeks(teks) : { soal: [], galat: [] }),
    [teks],
  );

  const pg = pratinjau.soal.filter((item) => item.jenis === "pg").length;
  const esai = pratinjau.soal.length - pg;
  const poin = pratinjau.soal.reduce((jumlah, item) => jumlah + item.bobot, 0);

  function impor() {
    setError(null);
    setPesan(null);
    setGalat([]);
    startTransition(async () => {
      const hasil = await imporBankSoalAction({ topikId: topik.id, teks });
      setGalat(hasil.galat);
      if (hasil.error) {
        setError(hasil.error);
        return;
      }

      const bagian = [
        `${hasil.jumlah} soal ditambahkan`,
        hasil.dilewati > 0 ? `${hasil.dilewati} dilewati karena sudah ada` : null,
      ].filter(Boolean);
      setPesan(`${bagian.join(", ")}.`);
      setTeks("");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        impor();
      }}
    >
      <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Semua soal di bawah masuk ke topik{" "}
        <span className="font-medium text-foreground">{topik.nama}</span>
        {topik.mapelNama ? ` · ${topik.mapelNama}` : ""}. Topiknya sudah ditentukan —
        tidak perlu diisi lagi di sini.
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor="impor-teks">Teks soal</Label>
          <button
            type="button"
            onClick={() => {
              setTeks(CONTOH);
              setError(null);
              setPesan(null);
            }}
            className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Isi contoh format
          </button>
        </div>

        <textarea
          id="impor-teks"
          value={teks}
          rows={14}
          onChange={(event) => {
            setTeks(event.target.value);
            setError(null);
            setPesan(null);
          }}
          placeholder={CONTOH}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />

        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Satu soal per blok: baris{" "}
            <span className="font-medium text-foreground">1. pertanyaan</span>, lalu{" "}
            <span className="font-medium text-foreground">A. opsi</span>, dan{" "}
            <span className="font-medium text-foreground">Kunci: A</span>. Tambahkan{" "}
            <span className="font-medium text-foreground">Bobot: 10</span> bila bobotnya
            bukan 1. Blok tanpa opsi dianggap esai (bobot 5). Baris kosong memisahkan
            soal.
          </p>
          <p className="mt-1">
            Soal yang sudah ada di topik ini akan dilewati, jadi menempel ulang file
            yang sama aman.
          </p>
        </div>
      </div>

      {teks.trim() ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            pratinjau.soal.length === 0
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
          )}
          role="status"
        >
          {pratinjau.soal.length === 0 ? (
            "Belum ada blok soal yang terbaca."
          ) : (
            <>
              Terbaca <span className="font-medium tabular-nums">{pratinjau.soal.length}</span>{" "}
              soal — {pg} pilihan ganda
              {esai > 0 ? `, ${esai} esai` : ""} · total {poin} poin.
            </>
          )}
        </div>
      ) : null}

      {pratinjau.soal.length > 0 ? (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-card p-3">
          {pratinjau.soal.map((item, index) => (
            <li key={`${index}-${item.pertanyaan.slice(0, 20)}`} className="text-xs">
              <span className="font-medium text-foreground tabular-nums">{index + 1}.</span>{" "}
              <span className="text-foreground">{item.pertanyaan}</span>
              <span className="ml-1 text-muted-foreground">
                ({labelJenisSoal(item.jenis)} · {item.bobot} poin)
              </span>
              {item.jenis === "pg" ? (
                <span className="ml-1 text-muted-foreground">
                  kunci {item.jawaban}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {pratinjau.galat.length > 0 || galat.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {[...new Set([...galat, ...pratinjau.galat])].map((butir) => (
            <li key={butir}>{butir}</li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {pesan ? (
        <p className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckIcon className="size-3.5" />
          {pesan}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          render={<Link href={`/guru/bank-soal/topik/${topik.id}`} />}
          nativeButton={false}
        >
          <XIcon />
          Batal
        </Button>
        <Button
          type="submit"
          disabled={pending || pratinjau.soal.length === 0}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
          Impor {pratinjau.soal.length > 0 ? `${pratinjau.soal.length} soal` : "soal"}
        </Button>
      </div>
    </form>
  );
}