"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronDownIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";

import { koreksiEsaiAction, resetPercobaanAction } from "@/app/actions/kuis";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatTanggalJam,
  statusPercobaan,
  type PercobaanRow,
  type SoalRow,
} from "@/lib/ruang-belajar-shared";

const HEAD =
  "px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground";

/**
 * The teacher's results table.
 *
 * Essays are corrected in place: opening a row shows the question, the answer,
 * and a score box capped at the question's own weight. Saving re-scores the
 * attempt on the server with the same helper the student's submit used, so a
 * corrected essay and an automatic question add up the same way.
 */
export function TabelHasil({
  ruangId,
  kuisId,
  percobaan,
  soalEsai,
  jawaban,
  nilaiEsai,
}: {
  ruangId: number;
  kuisId: number;
  percobaan: PercobaanRow[];
  /** Only the essay questions, in order. */
  soalEsai: SoalRow[];
  /** `jawaban[siswaId][soalId]` — what each student wrote. */
  jawaban: Record<string, Record<string, string>>;
  /** `nilaiEsai[siswaId][soalId]` — what the teacher already gave. */
  nilaiEsai: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [buka, setBuka] = useState<string | null>(null);
  const [skor, setSkor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  function bukaBaris(row: PercobaanRow) {
    if (buka === row.siswaId) {
      setBuka(null);
      return;
    }
    const awal: Record<string, string> = {};
    for (const butir of soalEsai) {
      const sudah = nilaiEsai[row.siswaId]?.[String(butir.id)];
      awal[String(butir.id)] = sudah === undefined ? "" : String(sudah);
    }
    setSkor(awal);
    setBuka(row.siswaId);
    setError(null);
    setPesan(null);
  }

  function simpan(siswaId: string) {
    setError(null);
    setPesan(null);
    const entri: Record<string, number> = {};
    for (const butir of soalEsai) {
      const mentah = skor[String(butir.id)] ?? "";
      if (mentah.trim() === "") continue;
      entri[String(butir.id)] = Number(mentah);
    }
    if (Object.keys(entri).length === 0) {
      setError("Isi skor minimal satu esai dulu.");
      return;
    }

    startTransition(async () => {
      const hasil = await koreksiEsaiAction({ ruangId, kuisId, siswaId, nilaiEsai: entri });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setPesan(
        hasil.nilai === null
          ? "Skor tersimpan. Masih ada esai yang belum dinilai."
          : `Skor tersimpan. Nilai kuis menjadi ${hasil.nilai}.`,
      );
      setBuka(null);
      router.refresh();
    });
  }

  function ulangi(siswaId: string) {
    setError(null);
    setPesan(null);
    startTransition(async () => {
      const hasil = await resetPercobaanAction({ ruangId, kuisId, siswaId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setPesan("Percobaan direset, siswa bisa mengerjakan ulang.");
      setBuka(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={cn(HEAD, "w-10")}>No</TableHead>
              <TableHead className={HEAD}>Siswa</TableHead>
              <TableHead className={cn(HEAD, "hidden w-28 sm:table-cell")}>Dikumpulkan</TableHead>
              <TableHead className={cn(HEAD, "w-32")}>Status</TableHead>
              <TableHead className={cn(HEAD, "w-20 text-right")}>Nilai</TableHead>
              <TableHead className={cn(HEAD, "w-24")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {percobaan.map((row, indeks) => {
              const status = statusPercobaan(row);
              const bisaKoreksi = row.perluKoreksi > 0 && soalEsai.length > 0;
              const terbuka = buka === row.siswaId;

              return (
                <Fragment key={row.siswaId}>
                  <TableRow className="border-border">
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                      {indeks + 1}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-foreground">
                      {row.nama}
                    </TableCell>
                    <TableCell className="hidden px-3 py-2 text-xs text-muted-foreground tabular-nums sm:table-cell">
                      {formatTanggalJam(row.dikumpulkan) ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                          TONE[status.tone],
                        )}
                      >
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-sm text-foreground tabular-nums">
                      {row.nilai ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {bisaKoreksi ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-expanded={terbuka}
                          aria-label={`Koreksi ${row.nama}`}
                          onClick={() => bukaBaris(row)}
                        >
                          <ChevronDownIcon
                            className={cn("transition-transform", terbuka && "rotate-180")}
                          />
                          Koreksi
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>

                  {terbuka ? (
                    <TableRow className="border-border bg-muted/30">
                      <TableCell colSpan={6} className="px-3 py-3">
                        <div className="space-y-3">
                          {soalEsai.map((butir) => {
                            const isi = jawaban[row.siswaId]?.[String(butir.id)] ?? "";
                            return (
                              <div key={butir.id} className="space-y-1.5">
                                <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                                  Soal {butir.urutan} · bobot {butir.bobot}
                                </p>
                                <p className="text-sm text-foreground">{butir.pertanyaan}</p>
                                <p className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm whitespace-pre-line text-foreground">
                                  {isi.trim() || "—"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor={`skor-${row.siswaId}-${butir.id}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Skor
                                  </label>
                                  <input
                                    id={`skor-${row.siswaId}-${butir.id}`}
                                    type="number"
                                    min={0}
                                    max={butir.bobot}
                                    aria-label={`Skor soal ${butir.urutan} ${row.nama}`}
                                    value={skor[String(butir.id)] ?? ""}
                                    onChange={(event) => {
                                      setSkor((lama) => ({
                                        ...lama,
                                        [String(butir.id)]: event.target.value,
                                      }));
                                      setError(null);
                                    }}
                                    className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                                  />
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    / {butir.bobot}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => ulangi(row.siswaId)}
                              disabled={pending}
                            >
                              <RotateCcwIcon />
                              Reset percobaan
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => simpan(row.siswaId)}
                              disabled={pending}
                            >
                              {pending ? <Loader2Icon className="animate-spin" /> : null}
                              Simpan koreksi
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

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
    </div>
  );
}
