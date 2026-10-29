"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";

import {
  cariTopikUntukKuisAction,
  sinkronKuisDariBankAction,
  soalTopikUntukKuisAction,
  tambahSoalDariBankAction,
  tambahTopikDariBankAction,
} from "@/app/actions/kuis";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  labelJenisSoalBank,
  type BankSoalRow,
  type MapelBankOption,
  type TopikRingkas,
} from "@/lib/bank-soal-shared";

/**
 * "Ambil topik dari bank" — assign by topic, not by question.
 *
 * This is how a quiz gets written in practice: a class reaches "Laju Reaksi",
 * and the whole topic goes in. Ticking fifteen questions one by one is the rare
 * case, so it lives behind each topic's "pilih sebagian".
 *
 * Topics are listed first and a topic's questions are fetched only when it is
 * opened: a teacher with forty topics should not download four hundred
 * questions to hand over one chapter.
 */
export function PilihDariBank({
  ruangId,
  kuisId,
  mapelId,
  mapel,
  jumlahSoal,
}: {
  ruangId: number;
  kuisId: number;
  /** The room's subject; the picker opens on it. */
  mapelId: number | null;
  mapel: MapelBankOption[];
  /** Existing question count, so an empty bank can be explained. */
  jumlahSoal: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [sudahMuat, setSudahMuat] = useState(false);
  const [topik, setTopik] = useState<TopikRingkas[]>([]);
  /** Questions of opened topics, by topic id — cleared on every new search. */
  const [soal, setSoal] = useState<Record<number, BankSoalRow[]>>({});

  const [filterMapel, setFilterMapel] = useState(mapelId ? String(mapelId) : "");
  const [cari, setCari] = useState("");

  /** Topics ticked whole. */
  const [topikDipilih, setTopikDipilih] = useState<number[]>([]);
  /** Individual questions ticked inside an opened topic. */
  const [soalDipilih, setSoalDipilih] = useState<number[]>([]);
  /** Topics whose question list is open for cherry-picking. */
  const [terbukaTopik, setTerbukaTopik] = useState<number[]>([]);
  const [memuatSoal, setMemuatSoal] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  function muat(next?: { mapelId?: string; cari?: string }) {
    const mapelNilai = next?.mapelId ?? filterMapel;
    const cariNilai = next?.cari ?? cari;

    setMemuat(true);
    setError(null);
    startTransition(async () => {
      const hasil = await cariTopikUntukKuisAction({
        ruangId,
        mapelId: mapelNilai ? Number(mapelNilai) : null,
        cari: cariNilai,
      });
      setMemuat(false);
      setSudahMuat(true);
      if (hasil.error) {
        setError(hasil.error);
        setTopik([]);
        return;
      }
      setTopik(hasil.topik);
      // The question lists belong to the old result set.
      setSoal({});
      setTerbukaTopik([]);
      setSoalDipilih([]);
    });
  }

  function toggleTopik(item: TopikRingkas) {
    setTopikDipilih((lama) =>
      lama.includes(item.id) ? lama.filter((id) => id !== item.id) : [...lama, item.id],
    );
    // A topic switched to "whole" absorbs the individual ticks inside it, so the
    // two lists can never describe the same question twice.
    setSoalDipilih((lama) => lama.filter((id) => !(id in daftarSoalDari(item.id))));
    setError(null);
  }

  function toggleSoal(topikId: number, bankId: number) {
    setSoalDipilih((lama) =>
      lama.includes(bankId) ? lama.filter((id) => id !== bankId) : [...lama, bankId],
    );
    setTopikDipilih((lama) => lama.filter((id) => id !== topikId));
    setError(null);
  }

  /** Reads the cached questions of a topic, so ticks can be cleared by id. */
  function daftarSoalDari(topikId: number): Record<number, BankSoalRow> {
    const peta: Record<number, BankSoalRow> = {};
    for (const butir of soal[topikId] ?? []) peta[butir.id] = butir;
    return peta;
  }

  function toggleBuka(item: TopikRingkas) {
    const sudah = terbukaTopik.includes(item.id);
    setTerbukaTopik((lama) =>
      sudah ? lama.filter((id) => id !== item.id) : [...lama, item.id],
    );
    if (sudah || soal[item.id] || item.soal === 0) return;

    setMemuatSoal(item.id);
    startTransition(async () => {
      const hasil = await soalTopikUntukKuisAction({
        ruangId,
        topikId: item.id,
        jenis: null,
        cari: "",
      });
      setMemuatSoal(null);
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setSoal((lama) => ({ ...lama, [item.id]: hasil.soal }));
    });
  }

  async function tugaskan() {
    setError(null);
    setPesan(null);
    if (topikDipilih.length === 0 && soalDipilih.length === 0) return;

    startTransition(async () => {
      let jumlah = 0;

      // Topics first: a topic is one call so the server resolves its questions
      // itself, then the loose picks are appended in tick order.
      for (const topikId of topikDipilih) {
        const hasil = await tambahTopikDariBankAction({ ruangId, kuisId, topikId });
        if (hasil.error) {
          setError(hasil.error);
          return;
        }
        jumlah += hasil.jumlah;
      }

      if (soalDipilih.length > 0) {
        const hasil = await tambahSoalDariBankAction({
          ruangId,
          kuisId,
          bankIds: soalDipilih,
        });
        if (hasil.error) {
          setError(hasil.error);
          return;
        }
        jumlah += hasil.jumlah;
      }

      setPesan(
        `${jumlah} soal ditambahkan` +
          (topikDipilih.length > 0
            ? ` dari ${topikDipilih.length} topik`
            : " ke kuis ini") +
          ".",
      );
      setTopikDipilih([]);
      setSoalDipilih([]);
      setTerbukaTopik([]);
      // Counts and usage figures moved; refetch on next open.
      setSudahMuat(false);
      router.refresh();
    });
  }

  const bobotDipilih =
    topik
      .filter((item) => topikDipilih.includes(item.id))
      .reduce((jumlah, item) => jumlah + item.bobot, 0) +
    Object.values(soal)
      .flat()
      .filter((item) => soalDipilih.includes(item.id))
      .reduce((jumlah, item) => jumlah + item.bobot, 0);

  const jumlahDipilih =
    topik
      .filter((item) => topikDipilih.includes(item.id))
      .reduce((jumlah, item) => jumlah + item.soal, 0) + soalDipilih.length;

  return (
    <Dialog
      open={terbuka}
      onOpenChange={(next) => {
        setTerbuka(next);
        setError(null);
        setPesan(null);
        if (next && !sudahMuat) muat();
        if (next) {
          setTopikDipilih([]);
          setSoalDipilih([]);
          setTerbukaTopik([]);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <FolderOpenIcon />
            Ambil topik dari bank
          </Button>
        }
      />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ambil topik dari bank</DialogTitle>
          <DialogDescription>
            Centang topik untuk memasukkan semua soalnya sesuai urutan di bank.
            Menambah soal menambah total bobot, jadi nilai siswa yang sudah
            mengerjakan ikut dihitung ulang.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cari}
              placeholder="Cari topik atau pertanyaan…"
              maxLength={100}
              className="pl-8"
              onChange={(event) => setCari(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  muat();
                }
              }}
            />
          </div>

          <NativeSelect
            value={filterMapel}
            onChange={(event) => {
              setFilterMapel(event.target.value);
              muat({ mapelId: event.target.value });
            }}
          >
            <NativeSelectOption value="">Semua mapel saya</NativeSelectOption>
            {mapel.map((item) => (
              <NativeSelectOption key={item.id} value={String(item.id)}>
                {item.nama} ({item.soal})
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <Button type="button" size="sm" variant="secondary" onClick={() => muat()}>
            Cari
          </Button>
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {pesan ? (
          <p className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckIcon className="size-3.5" />
            {pesan}
          </p>
        ) : null}

        <div className="min-h-40 space-y-2">
          {memuat ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Memuat topik…
            </p>
          ) : topik.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {sudahMuat ? "Tidak ada topik yang cocok di bank Anda." : "Membuka daftar…"}
              </p>
              {sudahMuat && jumlahSoal === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Bank soal diisi dari menu Bank Soal di sidebar: buat topik, lalu
                  isi soalnya di dalamnya.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {topik.map((item) => {
                const dipilih = topikDipilih.includes(item.id);
                const terbukaButir = terbukaTopik.includes(item.id);
                const isi = soal[item.id] ?? [];
                const juzAmbil = isi.filter((butir) => soalDipilih.includes(butir.id)).length;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-lg border transition-colors",
                      dipilih ? "border-primary/40 bg-primary/5" : "border-border/70",
                    )}
                  >
                    <div className="flex items-start gap-2.5 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={dipilih}
                        disabled={item.soal === 0}
                        aria-label={`Ambil seluruh topik ${item.nama}`}
                        onChange={() => toggleTopik(item)}
                        className="mt-1 size-4 shrink-0 accent-primary"
                      />
                      <label
                        className={cn(
                          "min-w-0 flex-1",
                          item.soal === 0 ? "cursor-default" : "cursor-pointer",
                        )}
                        onClick={() => item.soal > 0 && toggleTopik(item)}
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <FolderOpenIcon className="size-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {item.nama}
                          </span>
                          {item.mapelKode ? (
                            <span className="rounded bg-muted px-1 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                              {item.mapelKode}
                            </span>
                          ) : null}
                          <span className="text-[0.7rem] text-muted-foreground tabular-nums">
                            {item.soal === 0
                              ? "kosong"
                              : `${item.soal} soal · ${item.bobot} poin` +
                                (item.jumlahEsai > 0 ? ` · ${item.jumlahEsai} esai` : "")}
                          </span>
                          {juzAmbil > 0 && !dipilih ? (
                            <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300 tabular-nums">
                              {juzAmbil} soal dipilih
                            </span>
                          ) : null}
                        </span>
                      </label>

                      {item.soal > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleBuka(item)}
                          aria-expanded={terbukaButir}
                          className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.7rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {terbukaButir ? "Tutup" : "Pilih sebagian"}
                          <ChevronDownIcon
                            className={cn(
                              "size-3 transition-transform",
                              terbukaButir && "rotate-180",
                            )}
                          />
                        </button>
                      ) : null}
                    </div>

                    {terbukaButir ? (
                      <ul className="space-y-1 border-t border-border/60 px-3 py-2">
                        {memuatSoal === item.id ? (
                          <li className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                            <Loader2Icon className="size-3.5 animate-spin" />
                            Memuat soal…
                          </li>
                        ) : (
                          isi.map((butir) => (
                            <li key={butir.id}>
                              <label className="flex cursor-pointer gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={soalDipilih.includes(butir.id)}
                                  onChange={() => toggleSoal(item.id, butir.id)}
                                  className="mt-0.5 size-3.5 shrink-0 accent-primary"
                                />
                                <span className="min-w-0">
                                  <span className="flex flex-wrap gap-1.5 text-[0.65rem] text-muted-foreground">
                                    <span>{labelJenisSoalBank(butir.jenis)}</span>
                                    <span className="tabular-nums">· {butir.bobot} poin</span>
                                    {butir.dipakai > 0 ? (
                                      <span>· dipakai {butir.dipakai}×</span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 block whitespace-pre-line text-foreground">
                                    {butir.pertanyaan}
                                  </span>
                                </span>
                              </label>
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {topikDipilih.length > 0 ? (
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
            <Label className="text-xs text-muted-foreground">Akan ditambahkan</Label>
            <p className="mt-0.5 text-xs text-foreground">
              {topik
                .filter((item) => topikDipilih.includes(item.id))
                .map((item) => `${item.nama} (${item.soal} soal)`)
                .join(" · ")}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">
            {jumlahDipilih === 0
              ? "Belum ada yang dipilih"
              : `${jumlahDipilih} soal · ${bobotDipilih} poin`}
          </span>
          <Button type="button" variant="ghost" onClick={() => setTerbuka(false)}>
            Tutup
          </Button>
          <Button type="button" onClick={tugaskan} disabled={pending || jumlahDipilih === 0}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Tugaskan ke kuis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shows which questions came from the bank and offers the refresh.
 *
 * The refresh is opt-in on purpose: it rewrites answers' keys and therefore the
 * marks of anyone who already sat the quiz. Calling that automatic would be a
 * very quiet way to change a grade book.
 */
export function SinkronBankBar({
  ruangId,
  kuisId,
  jumlahBeda,
  adaPercobaan,
}: {
  ruangId: number;
  kuisId: number;
  jumlahBeda: number;
  adaPercobaan: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (jumlahBeda === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-600/25 bg-amber-500/10 px-3 py-2">
      <p className="text-xs text-amber-800 dark:text-amber-200">
        {jumlahBeda} soal sudah berubah di bank.{" "}
        {adaPercobaan
          ? "Menarik perubahan akan menghitung ulang nilai siswa yang sudah mengerjakan."
          : "Tarik perubahannya ke kuis ini?"}
      </p>
      <div className="flex items-center gap-2">
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
        {pesan ? <span className="text-xs text-foreground">{pesan}</span> : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null);
            setPesan(null);
            startTransition(async () => {
              const hasil = await sinkronKuisDariBankAction({ ruangId, kuisId });
              if (hasil.error) {
                setError(hasil.error);
                return;
              }
              setPesan(
                hasil.jumlah === 0
                  ? "Sudah sama dengan bank."
                  : `${hasil.jumlah} soal diperbarui.`,
              );
              router.refresh();
            });
          }}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Sinkronkan dari bank
        </Button>
      </div>
    </div>
  );
}