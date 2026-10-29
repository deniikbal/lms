"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  Loader2Icon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { hapusBankSoalAction, simpanBankSoalAction } from "@/app/actions/bank-soal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  HURUF,
  kunciSah,
  labelJenisSoalBank,
  soalBankSiap,
  type BankSoalRow,
  type JenisSoalBank,
  type TopikRingkas,
} from "@/lib/bank-soal-shared";
import { cn } from "@/lib/utils";

/** A–D only: E exists once the teacher adds it, not before. */
const OPSI_KOSONG: Record<string, string> = { A: "", B: "", C: "", D: "" };

/**
 * A, B, C and D always appear — a question with fewer than four options is rare
 * enough that hiding them would cost more keystrokes than it saves. E is opt-in
 * and is pruned from the submitted payload while empty, so `soalBankSiap` still
 * counts only what the teacher actually filled in.
 */
const OPSI_WAJIB = ["A", "B", "C", "D"] as const;

const AREA =
  "w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-input/30";

type Isi = {
  jenis: JenisSoalBank;
  pertanyaan: string;
  pilihan: Record<string, string>;
  kunci: string | null;
  bobot: string;
};

/**
 * Two columns: a sticky editor on the left, the topic's existing questions on
 * the right.
 *
 * Writing a batch of questions means keeping track of what you have already
 * written. Before, each question forced a round trip to the topic page; the
 * preview column gives that memory back without leaving the form.
 */
export function SoalBankEditor({
  topik,
  awal,
  soal = [],
}: {
  topik: TopikRingkas;
  /** Set when editing an existing question — the form then offers "save". */
  awal?: (Isi & { bankId: number }) | null;
  /** The topic's questions as of the last page load. */
  soal?: BankSoalRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const kembali = awal
    ? `/guru/bank-soal/soal/${awal.bankId}`
    : `/guru/bank-soal/topik/${topik.id}`;

  /**
   * The server list is the starting point, but a question saved without leaving
   * the page is appended here so the right column stays honest — `router.refresh`
   * would work too, yet it re-renders the whole draft under the cursor.
   */
  const [lokal, setLokal] = useState<BankSoalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState<string | null>(null);
  const [terbuka, setTerbuka] = useState<string[]>([]);

  const [isi, setIsi] = useState<Isi>(
    awal ?? {
      jenis: "pg",
      pertanyaan: "",
      pilihan: { ...OPSI_KOSONG },
      kunci: null,
      bobot: "1",
    },
  );

  /**
   * Server rows and locally saved rows share one list. `router.refresh()` after
   * a save can bring back an id that `lokal` already holds, so the merge is keyed
   * by id: server state wins for rows it knows about, and each question appears
   * exactly once.
   */
  const semua = useMemo(() => {
    const menurutId = new Map<number, BankSoalRow>();
    for (const item of [...soal, ...lokal]) menurutId.set(item.id, item);
    return [...menurutId.values()];
  }, [soal, lokal]);
  const opsiTambahan = HURUF.filter(
    (huruf) =>
      !OPSI_WAJIB.includes(huruf as (typeof OPSI_WAJIB)[number]) &&
      isi.pilihan[huruf] !== undefined,
  );
  const opsiTampil = [...OPSI_WAJIB, ...opsiTambahan];
  const opsiBerikut = HURUF.find((huruf) => !opsiTampil.includes(huruf));

  function ubah(patch: Partial<Isi>) {
    setIsi((lama) => ({ ...lama, ...patch }));
    setError(null);
    setTersimpan(null);
  }

  function kosongkanForm(jenis: JenisSoalBank) {
    setIsi((lama) => ({
      // The weight is kept on purpose: a topic's questions usually carry the
      // same points, so retyping it every time is busywork.
      bobot: lama.bobot,
      jenis,
      pertanyaan: "",
      pilihan: { ...OPSI_KOSONG },
      kunci: null,
    }));
  }

  function simpan(lanjut: boolean) {
    const siap = soalBankSiap({
      jenis: isi.jenis,
      pertanyaan: isi.pertanyaan,
      pilihan: isi.pilihan,
      jawaban: isi.jenis === "pg" ? kunciSah(isi.pilihan, isi.kunci) : null,
    });
    if (!siap.ok) {
      setError(siap.alasan);
      return;
    }

    // E that was added and left blank is not an option, it is an empty field.
    const pilihan = Object.fromEntries(
      Object.entries(isi.pilihan).filter(([, teks]) => teks.trim() !== ""),
    );

    setError(null);
    setTersimpan(null);
    startTransition(async () => {
      const hasil = await simpanBankSoalAction({
        bankId: awal?.bankId ?? null,
        topikId: topik.id,
        jenis: isi.jenis,
        pertanyaan: isi.pertanyaan,
        pilihan,
        jawaban: isi.jenis === "pg" ? kunciSah(isi.pilihan, isi.kunci) : null,
        bobot: Number(isi.bobot),
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }

      // The refresh below will fetch this question from the database; keeping the
      // optimistic copy would then show it twice.
      setLokal([]);

      if (awal) {
        // Editing leaves the page: the question is done, and staying on a form
        // that no longer differs from the database invites a duplicate submit.
        router.push(kembali);
        router.refresh();
        return;
      }

      if (lanjut) {
        setLokal((daftar) => [
          ...daftar,
          {
            id: hasil.id ?? -(daftar.length + 1),
            topikId: topik.id,
            mapelId: topik.mapelId,
            mapelKode: topik.mapelKode,
            mapelNama: topik.mapelNama,
            jenis: isi.jenis,
            pertanyaan: isi.pertanyaan,
            pilihan: isi.jenis === "pg" ? isi.pilihan : {},
            jawaban: isi.jenis === "pg" ? kunciSah(isi.pilihan, isi.kunci) : null,
            bobot: Number(isi.bobot),
            topik: topik.nama,
            dipakai: 0,
            dibuat: "",
            diperbarui: "",
          },
        ]);
        // A freshly saved question is worth seeing, not worth hunting for.
        if (hasil.id) setTerbuka((daftar) => [String(hasil.id), ...daftar]);

        const total = semua.length + 1;
        setTersimpan(`Soal ${total} tersimpan di topik ini.`);
        kosongkanForm(isi.jenis);
        return;
      }

      router.push(kembali);
      router.refresh();
    });
  }

  function hapus(bankId: number) {
    startTransition(async () => {
      const hasil = await hapusBankSoalAction({ bankId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setLokal((daftar) => daftar.filter((item) => item.id !== bankId));
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------ column 1: editor */}
      <form
        className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-20"
        onSubmit={(event) => {
          event.preventDefault();
          simpan(false);
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bank-jenis">Jenis</Label>
            <Select
              items={[
                { value: "pg", label: "Pilihan ganda" },
                { value: "esai", label: "Esai" },
              ]}
              value={isi.jenis}
              onValueChange={(nilai) => {
                const jenis = nilai as JenisSoalBank;
                ubah({ jenis, ...(jenis === "esai" ? { kunci: null } : {}) });
              }}
            >
              <SelectTrigger id="bank-jenis" className="min-w-40" aria-label="Jenis soal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pg">Pilihan ganda</SelectItem>
                <SelectItem value="esai">Esai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank-bobot">Bobot</Label>
            <Input
              id="bank-bobot"
              type="number"
              min={1}
              max={100}
              value={isi.bobot}
              onChange={(event) => ubah({ bobot: event.target.value })}
              className="w-24"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank-pertanyaan">Pertanyaan</Label>
          <textarea
            id="bank-pertanyaan"
            value={isi.pertanyaan}
            rows={4}
            maxLength={2000}
            autoFocus
            placeholder="Tulis pertanyaan lengkapnya di sini…"
            onChange={(event) => ubah({ pertanyaan: event.target.value })}
            className={AREA}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {isi.pertanyaan.length}/2000
          </p>
        </div>

        {isi.jenis === "pg" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Opsi dan kunci</legend>
            <p className="text-xs text-muted-foreground">
              Klik huruf di kiri untuk menandai jawaban benar.
            </p>

            {opsiTampil.map((huruf) => {
              const terpilih = isi.kunci === huruf;
              return (
                <div key={huruf} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kunci-bank"
                    id={`kunci-bank-${huruf}`}
                    aria-label={`Kunci ${huruf}`}
                    checked={terpilih}
                    onChange={() => ubah({ kunci: huruf })}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`kunci-bank-${huruf}`}
                    title={terpilih ? "Jawaban benar" : `Tandai ${huruf} sebagai jawaban benar`}
                    className={cn(
                      "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border text-xs font-semibold tabular-nums transition-colors",
                      "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40",
                      terpilih
                        ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                        : "border-input text-muted-foreground hover:border-emerald-600/50 hover:text-foreground",
                    )}
                  >
                    {terpilih ? <CheckIcon className="size-3.5" /> : huruf}
                  </label>
                  <Input
                    aria-label={`Opsi ${huruf}`}
                    value={isi.pilihan[huruf] ?? ""}
                    placeholder={`Opsi ${huruf}`}
                    onChange={(event) =>
                      ubah({ pilihan: { ...isi.pilihan, [huruf]: event.target.value } })
                    }
                    className={cn("flex-1", terpilih && "border-emerald-600/40")}
                  />
                </div>
              );
            })}

            {opsiBerikut ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() =>
                  // `""` marks the extra option as wanted; blank keys are dropped
                  // from the payload, so an unused E never reaches the database.
                  ubah({ pilihan: { ...isi.pilihan, [opsiBerikut]: "" } })
                }
              >
                <PlusIcon />
                Tambah opsi {opsiBerikut}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => {
                  const {
                    [opsiTambahan[0] ?? "E"]: _hapus,
                    ...sisa
                  } = isi.pilihan;
                  ubah({
                    pilihan: sisa,
                    kunci: isi.kunci === opsiTambahan[0] ? null : isi.kunci,
                  });
                }}
              >
                <MinusIcon />
                Hapus opsi {opsiTambahan[0]}
              </Button>
            )}
          </fieldset>
        ) : (
          <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Jawaban esai dikoreksi manual di halaman hasil kuis. Nilai baru dihitung
            setelah semua esai siswa dinilai.
          </p>
        )}

        {error ? (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {tersimpan ? (
          <p className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckIcon className="size-3.5" />
            {tersimpan}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            render={<Link href={kembali} />}
            nativeButton={false}
          >
            <XIcon />
            {awal ? "Batal" : "Selesai"}
          </Button>

          {awal ? (
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Simpan perubahan
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => simpan(true)}
              >
                {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                Simpan &amp; tulis lagi
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                Simpan soal
              </Button>
            </>
          )}
        </div>
      </form>

      {/* ------------------------------------------------ column 2: preview */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Soal di topik ini</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {semua.length} soal
          </p>
        </div>

        <Accordion multiple value={terbuka} onValueChange={setTerbuka}>
          {semua.map((item, urutan) => (
            <AccordionItem key={item.id} value={String(item.id)}>
              <AccordionTrigger>
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <span
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded text-[0.65rem] font-semibold tabular-nums",
                      item.jenis === "pg"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                    )}
                  >
                    {urutan + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm text-foreground">
                      {item.pertanyaan}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-normal text-muted-foreground">
                      <span className="tabular-nums">{item.bobot} poin</span>
                      <span aria-hidden>·</span>
                      <span>{labelJenisSoalBank(item.jenis)}</span>
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent>
                <div className="space-y-2 pb-3 pl-7">
                  {item.jenis === "pg" ? (
                    <ul className="space-y-1">
                      {Object.entries(item.pilihan).map(([huruf, teks]) => {
                        const kunci = huruf === item.jawaban;
                        return (
                          <li
                            key={huruf}
                            className={cn(
                              "flex items-start gap-1.5 rounded-md px-1 py-0.5 text-xs",
                              kunci
                                ? "bg-emerald-500/[0.08] font-medium text-emerald-800 dark:text-emerald-300"
                                : "text-muted-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-px grid size-4 shrink-0 place-items-center rounded text-[0.6rem] font-semibold",
                                kunci
                                  ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {kunci ? <CheckIcon className="size-2.5" /> : huruf}
                            </span>
                            <span className="min-w-0">{teks}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Esai · dikoreksi manual
                    </p>
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      nativeButton={false}
                      render={<Link href={`/guru/bank-soal/soal/${item.id}/ubah`} />}
                    >
                      <PencilIcon />
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => hapus(item.id)}
                    >
                      <Trash2Icon />
                      Hapus
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {semua.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-xs text-muted-foreground">
            Belum ada soal di topik ini. Yang Anda simpan akan muncul di sini.
          </p>
        ) : null}
      </section>
    </div>
  );
}