"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";

import {
  simpanMeetAction,
  simpanPengaturanAction,
} from "@/app/actions/ruang-belajar";
import { TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { namaHari, type RuangHeader } from "@/lib/ruang-belajar-shared";

/**
 * Room settings: the description, KKM, the three weights, and the Meet link of
 * each weekly slot. Teachers and admins only — students never get this tab.
 */
export function TabPengaturan({ ruang }: { ruang: RuangHeader }) {
  const router = useRouter();
  const [deskripsi, setDeskripsi] = useState(ruang.deskripsi ?? "");
  const [kkm, setKkm] = useState(String(ruang.kkm));
  const [tugas, setTugas] = useState(String(ruang.bobotTugas));
  const [kuis, setKuis] = useState(String(ruang.bobotKuis));
  const [kehadiran, setKehadiran] = useState(String(ruang.bobotKehadiran));
  const [error, setError] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState(false);
  const [pending, startTransition] = useTransition();

  const total =
    Number(tugas || 0) + Number(kuis || 0) + Number(kehadiran || 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const hasil = await simpanPengaturanAction({
        ruangId: ruang.id,
        deskripsi,
        kkm: Number(kkm),
        bobotTugas: Number(tugas),
        bobotKuis: Number(kuis),
        bobotKehadiran: Number(kehadiran),
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setTersimpan(true);
      setTimeout(() => setTersimpan(false), 1800);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deskripsi & penilaian</CardTitle>
          <CardDescription>
            Deskripsi muncul sebagai kartu “Catatan guru” di tab Materi.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pengaturan-deskripsi">Deskripsi</Label>
              <textarea
                id="pengaturan-deskripsi"
                value={deskripsi}
                onChange={(event) => setDeskripsi(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Kosongkan kalau tidak ingin ditampilkan."
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pengaturan-kkm">KKM</Label>
              <Input
                id="pengaturan-kkm"
                type="number"
                min={0}
                max={100}
                value={kkm}
                onChange={(event) => setKkm(event.target.value)}
                className="w-28"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Bobot nilai</Label>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums",
                    total === 100 ? TONE.hijau : TONE.merah,
                  )}
                >
                  Total {total}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bobot-tugas", label: "Tugas", value: tugas, set: setTugas },
                  { id: "bobot-kuis", label: "Kuis", value: kuis, set: setKuis },
                  {
                    id: "bobot-kehadiran",
                    label: "Kehadiran",
                    value: kehadiran,
                    set: setKehadiran,
                  },
                ].map((item) => (
                  <div key={item.id} className="space-y-1">
                    <Label
                      htmlFor={item.id}
                      className="text-xs text-muted-foreground"
                    >
                      {item.label}
                    </Label>
                    <Input
                      id={item.id}
                      type="number"
                      min={0}
                      max={100}
                      value={item.value}
                      onChange={(event) => {
                        item.set(event.target.value);
                        setError(null);
                      }}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="justify-end gap-2 border-t border-border/60">
            {tersimpan ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CheckIcon className="size-3.5 text-primary" />
                Tersimpan
              </span>
            ) : null}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Simpan
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Link kelas daring</CardTitle>
          <CardDescription>
            Satu link per slot jadwal. Muncul sebagai tombol “Gabung” di tab
            Materi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ruang.jadwal.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ruang ini belum punya slot jadwal. Tambahkan dari Pembagian
              Mengajar.
            </p>
          ) : (
            ruang.jadwal.map((slot) => (
              <SlotMeet key={slot.id} ruangId={ruang.id} slot={slot} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SlotMeet({
  ruangId,
  slot,
}: {
  ruangId: number;
  slot: { id: number; hari: number; jamMulai: string; jamSelesai: string; linkMeet: string | null };
}) {
  const router = useRouter();
  const [link, setLink] = useState(slot.linkMeet ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function simpan() {
    setError(null);
    startTransition(async () => {
      const hasil = await simpanMeetAction({
        ruangId,
        jadwalId: slot.id,
        linkMeet: link,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        {namaHari(slot.hari)}{" "}
        <span className="tabular-nums">
          {slot.jamMulai}–{slot.jamSelesai}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="url"
          aria-label={`Link Meet ${namaHari(slot.hari)} ${slot.jamMulai}`}
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError(null);
          }}
          placeholder="https://meet.google.com/…"
          className="h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={simpan}
          disabled={pending}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Simpan
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
