"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClockIcon,
  CheckIcon,
  EyeIcon,
  Loader2Icon,
  LockIcon,
  SendIcon,
  ShuffleIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

import { hapusKuisAction, simpanKuisAction } from "@/app/actions/kuis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saranTerbit, type KuisDetail } from "@/lib/ruang-belajar-shared";

/** `2026-10-29 07:00` → `2026-10-29T07:00`, which is what the input wants. */
function keLokal(nilai: string | null): string {
  return nilai ? nilai.replace(" ", "T") : "";
}

/** A titled block, so the panel reads as four short questions, not one long form. */
function Bagian({
  judul,
  ikon,
  keterangan,
  children,
}: {
  judul: string;
  ikon: React.ReactNode;
  keterangan?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div>
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
          {ikon}
          {judul}
        </p>
        {keterangan ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * The quiz settings panel.
 *
 * Publishing is a checkbox here rather than a separate button, but it is still
 * guarded on the server: a quiz with no questions cannot go out to the class,
 * because an empty quiz would put a 0 in the grade book for everyone.
 */
export function FormPengaturanKuis({ kuis, base }: { kuis: KuisDetail; base: string }) {
  const router = useRouter();
  const [judul, setJudul] = useState(kuis.judul);
  const [petunjuk, setPetunjuk] = useState(kuis.petunjuk ?? "");
  const [mulai, setMulai] = useState(keLokal(kuis.mulai));
  const [selesai, setSelesai] = useState(keLokal(kuis.selesai));
  const [durasi, setDurasi] = useState(String(kuis.durasiMenit));
  const [acakSoal, setAcakSoal] = useState(kuis.acakSoal);
  const [acakOpsi, setAcakOpsi] = useState(kuis.acakOpsi);
  const [tampilkanNilai, setTampilkanNilai] = useState(kuis.tampilkanNilai);
  const [terbit, setTerbit] = useState(kuis.terbit);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saran = saranTerbit(kuis);

  function simpan() {
    setError(null);
    setPesan(null);
    startTransition(async () => {
      const hasil = await simpanKuisAction({
        ruangId: kuis.ruangId,
        kuisId: kuis.id,
        judul,
        petunjuk,
        mulai: mulai || null,
        selesai: selesai || null,
        durasiMenit: Number(durasi),
        acakSoal,
        acakOpsi,
        tampilkanNilai,
        terbit,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setPesan(terbit ? "Kuis tersimpan dan terbit." : "Kuis tersimpan sebagai draf.");
      router.refresh();
    });
  }

  function hapus() {
    setError(null);
    setPesan(null);
    startTransition(async () => {
      const hasil = await hapusKuisAction({ ruangId: kuis.ruangId, kuisId: kuis.id });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      router.push(`${base}?tab=kuis`);
    });
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <h2 className="text-sm font-medium text-foreground">Pengaturan</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {kuis.jumlahSoal} soal · bobot {kuis.totalBobot}
          </p>
        </div>

        <div className="space-y-4 p-3">
          <Bagian judul="Identitas" ikon={<SendIcon className="size-3" />}>
            <div className="space-y-1.5">
              <Label htmlFor="kuis-judul">Judul</Label>
              <Input
                id="kuis-judul"
                value={judul}
                maxLength={120}
                onChange={(event) => {
                  setJudul(event.target.value);
                  setPesan(null);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kuis-petunjuk">Petunjuk</Label>
              <textarea
                id="kuis-petunjuk"
                value={petunjuk}
                rows={3}
                maxLength={2000}
                onChange={(event) => {
                  setPetunjuk(event.target.value);
                  setPesan(null);
                }}
                placeholder="Apa yang perlu siswa ketahui sebelum mulai…"
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
          </Bagian>

          <Bagian
            judul="Jadwal"
            ikon={<CalendarClockIcon className="size-3" />}
            keterangan="Kosongkan bila kuis hanya dibuka-tutup lewat terbit."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-1.5">
                <Label htmlFor="kuis-buka">Dibuka</Label>
                <Input
                  id="kuis-buka"
                  type="datetime-local"
                  value={mulai}
                  onChange={(event) => setMulai(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kuis-tutup">Ditutup</Label>
                <Input
                  id="kuis-tutup"
                  type="datetime-local"
                  value={selesai}
                  onChange={(event) => setSelesai(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kuis-durasi-menit">Durasi (menit)</Label>
              <Input
                id="kuis-durasi-menit"
                type="number"
                min={5}
                max={600}
                value={durasi}
                onChange={(event) => setDurasi(event.target.value)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Dihitung sejak siswa mulai, bukan sejak jadwal dibuka.
              </p>
            </div>
          </Bagian>

          <Bagian judul="Untuk siswa" ikon={<EyeIcon className="size-3" />}>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-foreground">
                  <ShuffleIcon className="size-3.5 text-muted-foreground" />
                  Acak urutan soal
                </span>
                <Switch checked={acakSoal} onCheckedChange={setAcakSoal} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-foreground">
                  <ShuffleIcon className="size-3.5 text-muted-foreground" />
                  Acak urutan opsi
                </span>
                <Switch checked={acakOpsi} onCheckedChange={setAcakOpsi} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-foreground">
                  <EyeIcon className="size-3.5 text-muted-foreground" />
                  Tampilkan nilai ke siswa
                </span>
                <Switch checked={tampilkanNilai} onCheckedChange={setTampilkanNilai} />
              </label>
            </div>
          </Bagian>

          <Bagian judul="Publikasi" ikon={<LockIcon className="size-3" />}>
            <label
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2 transition-colors",
                terbit
                  ? "border-emerald-600/30 bg-emerald-500/[0.07] dark:border-emerald-400/25 dark:bg-emerald-400/10"
                  : "border-amber-600/30 bg-amber-500/[0.07] dark:border-amber-400/25 dark:bg-amber-400/10",
              )}
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">
                  Terbitkan untuk siswa
                </span>
                <span className="mt-0.5 block text-[0.7rem] text-muted-foreground">
                  {terbit
                    ? "Muncul di tab Kuis siswa dan masuk rapor."
                    : "Draf: tidak terlihat siswa, tidak dihitung di rapor."}
                </span>
              </span>
              <Switch checked={terbit} onCheckedChange={setTerbit} />
            </label>

            {saran.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-amber-600/25 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                {saran.map((butir) => (
                  <li key={butir} className="flex items-start gap-1.5">
                    <TriangleAlertIcon className="mt-px size-3 shrink-0" />
                    {butir}
                  </li>
                ))}
              </ul>
            ) : null}
          </Bagian>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground" role="status">
            {pesan ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckIcon className="size-3.5" />
                {pesan}
              </span>
            ) : (
              "Perubahan disimpan saat tombol ditekan."
            )}
          </p>

          <Button type="button" size="sm" onClick={simpan} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Simpan
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Menghapus kuis ikut menghapus semua jawaban siswa.
        </p>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={hapus}
          disabled={pending}
        >
          <Trash2Icon />
          Hapus kuis
        </Button>
      </div>
    </div>
  );
}