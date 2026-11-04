"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon } from "lucide-react";

import {
  tambahKuisAction,
  tambahPertemuanAction,
  tambahTugasAction,
  ubahPertemuanAction,
  ubahTugasAction,
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

/** Pre-filled values when the same dialog is used to edit an existing meeting. */
export type PertemuanEdit = {
  id: number;
  judul: string;
  /** YYYY-MM-DD */
  tanggal: string;
  terbit: boolean;
  videoUrl: string | null;
  /** HH:MM */
  presensiBuka: string | null;
  presensiTutup: string | null;
  /** Set when the LMS made the Meet room; the switch starts ticked. */
  googleEventId: string | null;
  lampiranNama: string | null;
};

/** Pre-filled values when the dialog edits an existing task. */
export type TugasEdit = {
  id: number;
  judul: string;
  /** `YYYY-MM-DD HH:MM` (Jakarta), or null when there is no deadline. */
  tenggat: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
  /** Optional PDF the teacher attached (Drive). */
  lampiranNama: string | null;
  lampiranUrl: string | null;
};

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
 *
 * Passing `pertemuan` reuses the same form to edit a meeting, hence the
 * swappable trigger.
 */
export function BuatDialog({
  ruangId,
  jenis,
  pertemuan,
  tugas,
  pemicu,
}: {
  ruangId: number;
  jenis: JenisBuat;
  pertemuan?: PertemuanEdit;
  tugas?: TugasEdit;
  pemicu?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [judul, setJudul] = useState(pertemuan?.judul ?? tugas?.judul ?? "");
  const [tanggal, setTanggal] = useState(pertemuan?.tanggal ?? "");
  const [materi, setMateri] = useState("");
  const [presensiBuka, setPresensiBuka] = useState(
    pertemuan ? (pertemuan.presensiBuka ?? "") : "07:00",
  );
  const [presensiTutup, setPresensiTutup] = useState(
    pertemuan ? (pertemuan.presensiTutup ?? "") : "15:00",
  );
  const [videoUrl, setVideoUrl] = useState(pertemuan?.videoUrl ?? "");
  const [buatMeet, setBuatMeet] = useState(Boolean(pertemuan?.googleEventId));
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [hapusLampiran, setHapusLampiran] = useState(false);
  const [terbit, setTerbit] = useState(pertemuan?.terbit ?? true);

  const [tenggat, setTenggat] = useState(tugas?.tenggat ?? "");
  const [tipe, setTipe] = useState<"file" | "teks" | "keduanya">(
    tugas?.tipe ?? "file",
  );
  const [bolehTerlambat, setBolehTerlambat] = useState(tugas?.bolehTerlambat ?? true);

  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");
  const [durasi, setDurasi] = useState("60");

  const tipeItems: Record<string, React.ReactNode> = {
    file: "Hanya file",
    teks: "Hanya teks",
    keduanya: "File atau teks",
  };

  function reset() {
    setJudul(pertemuan?.judul ?? tugas?.judul ?? "");
    setTanggal(pertemuan?.tanggal ?? "");
    setMateri("");
    setPresensiBuka(pertemuan ? (pertemuan.presensiBuka ?? "") : "07:00");
    setPresensiTutup(pertemuan ? (pertemuan.presensiTutup ?? "") : "15:00");
    setVideoUrl(pertemuan?.videoUrl ?? "");
    setBuatMeet(Boolean(pertemuan?.googleEventId));
    setLampiran(null);
    setHapusLampiran(false);
    setTerbit(pertemuan?.terbit ?? true);
    setTenggat(tugas?.tenggat ?? "");
    setTipe(tugas?.tipe ?? "file");
    setBolehTerlambat(tugas?.bolehTerlambat ?? true);
    setMulai("");
    setSelesai("");
    setDurasi("60");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const hasil = pertemuan
        ? await ubahPertemuanAction({
            ruangId,
            pertemuanId: pertemuan.id,
            judul,
            tanggal,
            terbit,
            buatMeet,
            videoUrl,
            presensiBuka,
            presensiTutup,
            lampiran,
            hapusLampiran: hapusLampiran && !lampiran,
          })
        : jenis === "pertemuan"
          ? await tambahPertemuanAction({
              ruangId,
              judul,
              tanggal,
              terbit,
              buatMeet,
              materi,
              videoUrl,
              presensiBuka,
              presensiTutup,
              lampiran,
            })
          : jenis === "tugas"
            ? tugas
              ? await ubahTugasAction({
                  ruangId,
                  tugasId: tugas.id,
                  judul,
                  tenggat,
                  tipe,
                  bolehTerlambat,
                  terbit,
                  lampiran,
                  hapusLampiran: hapusLampiran && !lampiran,
                })
              : await tambahTugasAction({
                  ruangId,
                  judul,
                  tenggat,
                  tipe,
                  bolehTerlambat,
                  terbit,
                  lampiran,
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
      {pemicu ? (
        <DialogTrigger render={pemicu} />
      ) : (
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
          <PlusIcon />
          {JUDUL[jenis].tombol}
        </DialogTrigger>
      )}

      {/* Lebar di desktop + isi bisa discroll: form panjang tetap muat satu layar. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {pertemuan
              ? "Ubah pertemuan"
              : tugas
                ? "Ubah tugas"
                : JUDUL[jenis].judul}
          </DialogTitle>
          <DialogDescription>
            {pertemuan
              ? "Judul, tanggal, link video, dan jendela presensi. Materi ditulis di halaman pertemuan."
              : tugas
                ? "Judul, tenggat, jenis pengumpulan, dan status terbit. Jawaban siswa tidak terpengaruh."
                : JUDUL[jenis].deskripsi}
          </DialogDescription>
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
              {/* Tanggal + jendela presensi berdampingan — hemat tinggi. */}
              <div className="grid gap-3 sm:grid-cols-3">
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

              {/* Video + lampiran berdampingan di desktop. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pertemuan-video">
                    Link video (opsional — satu URL per baris)
                  </Label>
                  <textarea
                    id="pertemuan-video"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder={"https://youtube.com/watch?v=…\nhttps://youtube.com/watch?v=…"}
                    rows={2}
                    className="flex min-h-0 h-[calc(1.5rem*2+1rem)] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bisa lebih dari satu video — tulis satu link per baris.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pertemuan-lampiran">Lampiran PDF (opsional)</Label>
                  {pertemuan?.lampiranNama && !lampiran && !hapusLampiran ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                      <span className="truncate text-foreground">{pertemuan.lampiranNama}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setHapusLampiran(true)}
                      >
                        Hapus
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id="pertemuan-lampiran"
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        setLampiran(event.target.files?.[0] ?? null);
                        setHapusLampiran(false);
                      }}
                    />
                  )}
                  {pertemuan?.lampiranNama && hapusLampiran ? (
                    <p className="text-[0.7rem] text-muted-foreground">
                      Lampiran lama dihapus saat disimpan.
                    </p>
                  ) : null}
                </div>
              </div>

              {pertemuan ? null : (
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
              )}

              <label className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                <span className="space-y-0.5">
                  <span className="block text-sm text-foreground">
                    Buat link Google Meet
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    {pertemuan?.googleEventId
                      ? "Jadwal event di Google Calendar ikut diperbarui; link lama tetap."
                      : "Event dibuat di kalender akun sekolah. Link video di atas akan ditimpa."}
                  </span>
                </span>
                <Switch checked={buatMeet} onCheckedChange={setBuatMeet} />
              </label>
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

              <div className="space-y-1.5">
                <Label htmlFor="tugas-lampiran">Lampiran PDF (opsional)</Label>
                {tugas?.lampiranNama && !lampiran && !hapusLampiran ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <span className="truncate text-foreground">{tugas.lampiranNama}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setHapusLampiran(true)}
                    >
                      Hapus
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="tugas-lampiran"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      setLampiran(event.target.files?.[0] ?? null);
                      setHapusLampiran(false);
                    }}
                  />
                )}
                {tugas?.lampiranNama && hapusLampiran ? (
                  <p className="text-[0.7rem] text-muted-foreground">
                    Lampiran lama dihapus saat disimpan.
                  </p>
                ) : null}
              </div>
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
