"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon } from "lucide-react";

import {
  tambahKuisAction,
  tambahPertemuanAction,
  tambahTugasAction,
} from "@/app/actions/ruang-belajar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type JenisBuat = "pertemuan" | "tugas" | "kuis";

const JUDUL: Record<JenisBuat, { tombol: string; judul: string; deskripsi: string }> = {
  pertemuan: {
    tombol: "Pertemuan",
    judul: "Pertemuan baru",
    deskripsi:
      "Satu pertemuan = satu kartu di tab Materi. Nomor urut diisi otomatis.",
  },
  tugas: {
    tombol: "Tugas",
    judul: "Tugas baru",
    deskripsi: "Siswa mengumpulkan di tab Tugas. Draf tidak terlihat oleh siswa.",
  },
  kuis: {
    tombol: "Kuis",
    judul: "Kuis baru",
    deskripsi:
      "Kuis dibuat sebagai draf dulu; soal ditambahkan sebelum diterbitkan.",
  },
};

/**
 * The three "+ …" buttons in the room header.
 *
 * One dialog with three shapes instead of three dialogs — the fields barely
 * overlap, but the open/submit/close cycle is identical.
 */
export function BuatDialog({
  ruangId,
  jenis,
}: {
  ruangId: number;
  jenis: JenisBuat;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [materi, setMateri] = useState("");
  const [presensiBuka, setPresensiBuka] = useState("07:00");
  const [presensiTutup, setPresensiTutup] = useState("15:00");
  const [videoUrl, setVideoUrl] = useState("");
  const [terbit, setTerbit] = useState(true);

  const [tenggat, setTenggat] = useState("");
  const [tipe, setTipe] = useState<"file" | "teks" | "keduanya">("file");
  const [bolehTerlambat, setBolehTerlambat] = useState(true);

  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [durasi, setDurasi] = useState("60");

  const tipeItems: Record<string, React.ReactNode> = {
    file: "Hanya file",
    teks: "Hanya teks",
    keduanya: "File atau teks",
  };

  function reset() {
    setJudul("");
    setTanggal("");
    setMateri("");
    setPresensiBuka("07:00");
    setPresensiTutup("15:00");
    setVideoUrl("");
    setTerbit(true);
    setTenggat("");
    setTipe("file");
    setBolehTerlambat(true);
    setMulai("");
    setSelesai("");
    setDurasi("60");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const hasil =
        jenis === "pertemuan"
          ? await tambahPertemuanAction({
              ruangId,
              judul,
              tanggal,
              terbit,
              materi,
              videoUrl,
              presensiBuka,
              presensiTutup,
            })
          : jenis === "tugas"
            ? await tambahTugasAction({
                ruangId,
                judul,
                tenggat,
                tipe,
                bolehTerlambat,
                terbit,
              })
            : await tambahKuisAction({
                ruangId,
                judul,
                mulai,
                selesai,
                durasiMenit: Number(durasi),
                terbit,
              });

      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={<Button type="button" size="sm" variant="outline" />}
      >
        <PlusIcon />
        {JUDUL[jenis].tombol}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{JUDUL[jenis].judul}</DialogTitle>
          <DialogDescription>{JUDUL[jenis].deskripsi}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${jenis}-judul`}>Judul</Label>
            <Input
              id={`${jenis}-judul`}
              value={judul}
              onChange={(event) => {
                setJudul(event.target.value);
                setError(null);
              }}
              maxLength={120}
              placeholder={
                jenis === "pertemuan"
                  ? "mis. Konsep dasar kewirausahaan"
                  : jenis === "tugas"
                    ? "mis. Proposal usaha kecil"
                    : "mis. Kuis bab 1"
              }
              autoComplete="off"
            />
          </div>

          {jenis === "pertemuan" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pertemuan-tanggal">Tanggal</Label>
                  <Input
                    id="pertemuan-tanggal"
                    type="date"
                    value={tanggal}
                    onChange={(event) => setTanggal(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pertemuan-video">Link video (opsional)</Label>
                  <Input
                    id="pertemuan-video"
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pertemuan-materi">
                  Materi{" "}
                  <span className="font-normal text-muted-foreground">(opsional)</span>
                </Label>
                <textarea
                  id="pertemuan-materi"
                  value={materi}
                  rows={4}
                  maxLength={8000}
                  onChange={(event) => setMateri(event.target.value)}
                  placeholder="Ringkasan, tujuan pembelajaran, atau langkah kegiatan…"
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="presensi-buka">Presensi dibuka</Label>
                  <Input
                    id="presensi-buka"
                    type="time"
                    value={presensiBuka}
                    onChange={(event) => setPresensiBuka(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="presensi-tutup">Presensi ditutup</Label>
                  <Input
                    id="presensi-tutup"
                    type="time"
                    value={presensiTutup}
                    onChange={(event) => setPresensiTutup(event.target.value)}
                  />
                </div>
              </div>
            </>
          ) : null}

          {jenis === "tugas" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tugas-tenggat">Tenggat</Label>
                  <Input
                    id="tugas-tenggat"
                    type="datetime-local"
                    value={tenggat}
                    onChange={(event) => setTenggat(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tugas-tipe">Pengumpulan</Label>
                  <Select
                    items={tipeItems}
                    value={tipe}
                    onValueChange={(value) => setTipe(value as typeof tipe)}
                  >
                    <SelectTrigger id="tugas-tipe" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipeItems).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                <span className="text-sm text-foreground">Boleh terlambat</span>
                <Switch checked={bolehTerlambat} onCheckedChange={setBolehTerlambat} />
              </label>
            </>
          ) : null}

          {jenis === "kuis" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kuis-mulai">Mulai</Label>
                  <Input
                    id="kuis-mulai"
                    type="datetime-local"
                    value={mulai}
                    onChange={(event) => setMulai(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kuis-selesai">Selesai</Label>
                  <Input
                    id="kuis-selesai"
                    type="datetime-local"
                    value={selesai}
                    onChange={(event) => setSelesai(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kuis-durasi">Durasi (menit)</Label>
                <Input
                  id="kuis-durasi"
                  type="number"
                  min={5}
                  max={600}
                  value={durasi}
                  onChange={(event) => setDurasi(event.target.value)}
                  className="w-28"
                />
              </div>
            </>
          ) : null}

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
            <span className="text-sm text-foreground">
              {jenis === "kuis" ? "Terbitkan kuis" : "Terbitkan sekarang"}
            </span>
            <Switch checked={terbit} onCheckedChange={setTerbit} />
          </label>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
