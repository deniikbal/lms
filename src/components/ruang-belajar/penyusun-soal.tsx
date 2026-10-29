"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ClipboardListIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import {
  hapusSoalAction,
  imporSoalAction,
  simpanSoalAction,
} from "@/app/actions/kuis";
import { PilihDariBank, SinkronBankBar } from "@/components/bank-soal/pilih-dari-bank";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MapelBankOption } from "@/lib/bank-soal-shared";
import {
  HURUF,
  labelJenisSoal,
  type JenisSoal,
  type SoalRow,
} from "@/lib/ruang-belajar-shared";

const OPSI_KOSONG: Record<string, string> = {
  A: "",
  B: "",
  C: "",
  D: "",
  E: "",
};

const CONTOH_IMPOR = `1. Ibu kota Provinsi Jawa Barat adalah…
A. Bandung
B. Semarang
C. Surabaya
D. Medan
Kunci: A

2. Jelaskan perbedaan pasar tradisional dan pasar modern.`;

/** Tint of the number box: the question type, not the position, owns the hue. */
const WARNA_JENIS: Record<JenisSoal, string> = {
  pg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  esai: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

/**
 * The question list and the form that writes it.
 *
 * Editing reuses the same form as adding — one set of rules, one save path —
 * and every change re-scores the attempts already collected, which is why the
 * warning about existing attempts is shown before the list.
 */
export function PenyusunSoal({
  ruangId,
  kuisId,
  soal,
  adaPercobaan,
  mapel,
  mapelId,
}: {
  ruangId: number;
  kuisId: number;
  soal: SoalRow[];
  adaPercobaan: boolean;
  /** Subjects the room owner keeps a bank for, for the picker's dropdown. */
  mapel: MapelBankOption[];
  /** The room's own subject; the picker opens on it. */
  mapelId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [terbuka, setTerbuka] = useState(false);
  const [ubah, setUbah] = useState<SoalRow | null>(null);
  const [jenis, setJenis] = useState<JenisSoal>("pg");
  const [pertanyaan, setPertanyaan] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, string>>(OPSI_KOSONG);
  const [kunci, setKunci] = useState<string | null>(null);
  const [bobot, setBobot] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const [konfirmasi, setKonfirmasi] = useState<number | null>(null);
  const [imporTeks, setImporTeks] = useState("");
  const [imporPesan, setImporPesan] = useState<string | null>(null);
  const [imporGalat, setImporGalat] = useState<string[]>([]);

  const totalBobot = soal.reduce((jumlah, item) => jumlah + item.bobot, 0);
  const jumlahBeda = soal.filter((item) => item.bedaDariBank).length;
  const jumlahEsai = soal.filter((item) => item.jenis === "esai").length;

  function reset() {
    setUbah(null);
    setJenis("pg");
    setPertanyaan("");
    setPilihan(OPSI_KOSONG);
    setKunci(null);
    setBobot("1");
    setError(null);
  }

  function mulaiUbah(item: SoalRow) {
    setUbah(item);
    setJenis(item.jenis);
    setPertanyaan(item.pertanyaan);
    setPilihan({ ...OPSI_KOSONG, ...item.pilihan });
    setKunci(item.jawaban);
    setBobot(String(item.bobot));
    setError(null);
    setTerbuka(true);
    // The form sits below the list; bringing it into view is the only way the
    // teacher sees that "Ubah" actually loaded the question.
    document.getElementById("form-soal")?.scrollIntoView({ block: "center" });
  }

  function simpan() {
    setError(null);
    startTransition(async () => {
      const hasil = await simpanSoalAction({
        ruangId,
        kuisId,
        soalId: ubah?.id ?? null,
        jenis,
        pertanyaan,
        pilihan,
        jawaban: jenis === "pg" ? kunci : null,
        bobot: Number(bobot),
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      reset();
      setTerbuka(false);
      router.refresh();
    });
  }

  function hapus(soalId: number) {
    setError(null);
    startTransition(async () => {
      const hasil = await hapusSoalAction({ ruangId, kuisId, soalId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setKonfirmasi(null);
      router.refresh();
    });
  }

  function impor() {
    setError(null);
    setImporPesan(null);
    setImporGalat([]);
    startTransition(async () => {
      const hasil = await imporSoalAction({ ruangId, kuisId, teks: imporTeks });
      setImporGalat(hasil.galat);
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setImporPesan(
        hasil.jumlah === 1 ? "1 soal diimpor." : `${hasil.jumlah} soal diimpor.`,
      );
      setImporTeks("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Soal</h2>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground tabular-nums ring-1 ring-border">
              {soal.length}
            </span>
          </div>

          <p className="text-xs text-muted-foreground tabular-nums">
            bobot {totalBobot} · {jumlahEsai} esai
          </p>
        </div>

        <div className="space-y-2 p-3">
          {adaPercobaan ? (
            <p className="rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Sudah ada siswa yang mengerjakan. Mengubah atau menghapus soal akan
              menghitung ulang nilai mereka.
            </p>
          ) : null}

          <SinkronBankBar
            ruangId={ruangId}
            kuisId={kuisId}
            jumlahBeda={jumlahBeda}
            adaPercobaan={adaPercobaan}
          />

          {soal.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada soal. Tambah satu per satu, atau ambil satu topik dari bank.
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {soal.map((item) => {
                const opsi = Object.keys(item.pilihan).sort();
                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 gap-2">
                        <span
                          className={cn(
                            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums",
                            WARNA_JENIS[item.jenis],
                          )}
                        >
                          {item.urutan}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm whitespace-pre-line text-foreground">
                            {item.pertanyaan}
                          </p>
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                                item.jenis === "esai" ? TONE.ungu : TONE.biru,
                              )}
                            >
                              {labelJenisSoal(item.jenis)}
                            </span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums">
                              {item.bobot} poin
                            </span>
                            {item.bankSoalId !== null ? (
                              <span
                                title="Disalin dari Bank Soal"
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                                  item.bedaDariBank ? TONE.kuning : TONE.netral,
                                )}
                              >
                                {item.bedaDariBank ? "bank · berubah" : "bank"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Ubah soal ${item.urutan}`}
                          onClick={() => mulaiUbah(item)}
                        >
                          <PencilIcon />
                        </Button>

                        {konfirmasi === item.id ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={pending}
                              onClick={() => hapus(item.id)}
                            >
                              Ya, hapus
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setKonfirmasi(null)}
                            >
                              Batal
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Hapus soal ${item.urutan}`}
                            onClick={() => setKonfirmasi(item.id)}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </div>
                    </div>

                    {opsi.length > 0 ? (
                      <ul className="space-y-1 border-t border-border bg-muted/30 px-3 py-2 pl-11">
                        {opsi.map((huruf) => {
                          const benar = item.jawaban === huruf;
                          return (
                            <li
                              key={huruf}
                              className={cn(
                                "flex items-start gap-1.5 text-xs",
                                benar
                                  ? "font-medium text-emerald-700 dark:text-emerald-300"
                                  : "text-muted-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-4 shrink-0 place-items-center rounded text-[0.6rem] font-semibold tabular-nums",
                                  benar
                                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                    : "bg-background text-muted-foreground ring-1 ring-border",
                                )}
                              >
                                {huruf}
                              </span>
                              <span className="min-w-0">{item.pilihan[huruf]}</span>
                              {benar ? (
                                <span className="ml-0.5 inline-flex items-center gap-1 text-[0.6rem] tracking-wide uppercase opacity-80">
                                  <CheckIcon className="size-3" aria-hidden />
                                  kunci
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}

          {error && !terbuka ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-3 py-2.5">
          {terbuka ? (
            <p className="text-xs text-muted-foreground">
              Form soal terbuka di bawah daftar.
            </p>
          ) : (
            <>
              <PilihDariBank
                ruangId={ruangId}
                kuisId={kuisId}
                mapelId={mapelId}
                mapel={mapel}
                jumlahSoal={soal.length}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  reset();
                  setTerbuka(true);
                }}
              >
                <PlusIcon />
                Tambah soal
              </Button>
            </>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- form soal */}
      {terbuka ? (
        <section
          id="form-soal"
          className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              {ubah ? `Ubah soal ${ubah.urutan}` : "Soal baru"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Satu soal tidak mengubah soal lain.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soal-jenis">Jenis</Label>
              <Select
                value={jenis}
                onValueChange={(nilai) => {
                  const berikut = (nilai ?? "pg") as JenisSoal;
                  setJenis(berikut);
                  if (berikut === "esai") setKunci(null);
                }}
                items={[
                  { value: "pg", label: "Pilihan ganda" },
                  { value: "esai", label: "Esai" },
                ]}
              >
                <SelectTrigger id="soal-jenis" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pg">Pilihan ganda</SelectItem>
                  <SelectItem value="esai">Esai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soal-bobot">Bobot</Label>
              <Input
                id="soal-bobot"
                type="number"
                min={1}
                max={100}
                value={bobot}
                onChange={(event) => setBobot(event.target.value)}
                className="w-24"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="soal-pertanyaan">Pertanyaan</Label>
            <textarea
              id="soal-pertanyaan"
              value={pertanyaan}
              rows={3}
              maxLength={2000}
              onChange={(event) => {
                setPertanyaan(event.target.value);
                setError(null);
              }}
              placeholder="Tulis pertanyaan lengkap dengan konteksnya…"
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>

          {jenis === "pg" ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium text-foreground">
                Opsi dan kunci
              </legend>
              <p className="text-xs text-muted-foreground">
                Klik kotak huruf untuk menandai jawaban benar. Kosongkan opsi yang
                tidak dipakai.
              </p>

              {HURUF.map((huruf) => {
                const benar = kunci === huruf;
                return (
                  <div key={huruf} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="kunci-soal"
                      id={`kunci-${huruf}`}
                      aria-label={`Kunci ${huruf}`}
                      checked={benar}
                      onChange={() => setKunci(huruf)}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={`kunci-${huruf}`}
                      title={`Jadikan ${huruf} kunci jawaban`}
                      className={cn(
                        "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-xs font-semibold tabular-nums transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30",
                        benar
                          ? "bg-emerald-600 text-white dark:bg-emerald-500"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                      )}
                    >
                      {benar ? <CheckIcon className="size-3.5" aria-hidden /> : huruf}
                    </label>
                    <Input
                      aria-label={`Opsi ${huruf}`}
                      value={pilihan[huruf] ?? ""}
                      onChange={(event) => {
                        setPilihan((lama) => ({ ...lama, [huruf]: event.target.value }));
                        setError(null);
                      }}
                      placeholder={`Opsi ${huruf}`}
                    />
                  </div>
                );
              })}
            </fieldset>
          ) : (
            <p className="rounded-lg border border-violet-600/25 bg-violet-500/[0.07] px-3 py-2 text-xs text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300">
              Jawaban esai dikoreksi manual di halaman hasil. Nilai kuis baru dihitung
              setelah semua esai siswa dinilai.
            </p>
          )}

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                reset();
                setTerbuka(false);
              }}
              disabled={pending}
            >
              <XIcon />
              Batal
            </Button>
            <Button type="button" size="sm" onClick={simpan} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {ubah ? "Simpan perubahan" : "Tambah soal"}
            </Button>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ impor */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Impor dari teks</h2>
          <p className="text-xs text-muted-foreground">Untuk banyak soal sekaligus</p>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Satu soal per blok: baris <span className="font-medium">1. pertanyaan</span>,
            lalu <span className="font-medium">A. opsi</span>, dan{" "}
            <span className="font-medium">Kunci: A</span>. Blok tanpa opsi dianggap
            esai dengan bobot 5.
          </p>

          <textarea
            aria-label="Teks soal"
            value={imporTeks}
            rows={8}
            onChange={(event) => {
              setImporTeks(event.target.value);
              setImporPesan(null);
              setImporGalat([]);
              setError(null);
            }}
            placeholder={CONTOH_IMPOR}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" role="status">
              {imporPesan ? (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <CheckIcon className="size-3.5 text-primary" />
                  {imporPesan}
                </span>
              ) : (
                ""
              )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={impor}
              disabled={pending || imporTeks.trim().length === 0}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Impor soal
            </Button>
          </div>

          {imporGalat.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              {imporGalat.map((butir) => (
                <li key={butir}>{butir}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}