"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";

import {
  buatKuisGoogleFormAction,
  simpanFormUrlAction,
} from "@/app/actions/google-form";
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
import type { RuangPilihan } from "@/lib/google-form";

/**
 * "Buat Google Form" — turns the topic into a quiz answered in Google Forms.
 *
 * Two steps in one dialog: pick the room and title, and the server creates a
 * draft quiz with a private webhook token and hands back an Apps Script. The
 * teacher runs that script once in script.google.com — it builds the form and
 * installs the submit trigger — then pastes the form URL back here.
 */
export function GoogleFormDialog({
  topikId,
  namaTopik,
  ruang,
}: {
  topikId: number;
  namaTopik: string;
  ruang: RuangPilihan[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [terbuka, setTerbuka] = useState(false);
  const [ruangId, setRuangId] = useState(ruang[0] ? String(ruang[0].id) : "");
  const [judul, setJudul] = useState(namaTopik);
  const [galat, setGalat] = useState<string | null>(null);

  const [kuisId, setKuisId] = useState<number | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [urlForm, setUrlForm] = useState("");
  const [tersalin, setTersalin] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  function buat() {
    setGalat(null);
    startTransition(async () => {
      const hasil = await buatKuisGoogleFormAction({
        topikId,
        ruangId: Number(ruangId),
        judul,
      });
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      setKuisId(hasil.kuisId);
      setScript(hasil.script);
    });
  }

  function simpanUrl() {
    if (!kuisId) return;
    setGalat(null);
    startTransition(async () => {
      const hasil = await simpanFormUrlAction({ kuisId, url: urlForm });
      if (hasil.error) {
        setGalat(hasil.error);
        return;
      }
      setTersimpan(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={ruang.length === 0}>
            Buat Google Form
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        {script === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Buat Google Form dari topik ini</DialogTitle>
              <DialogDescription>
                Semua soal di topik ini disalin ke kuis baru, lalu LMS membuatkan
                script Apps Script. Script itu yang membuat form di Google dan
                mengirim setiap jawaban balik ke LMS.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gf-ruang">Ruang kelas</Label>
                <NativeSelect
                  id="gf-ruang"
                  value={ruangId}
                  onChange={(e) => setRuangId(e.target.value)}
                >
                  {ruang.map((item) => (
                    <NativeSelectOption key={item.id} value={String(item.id)}>
                      {item.kelasNama}
                      {item.mapelNama ? ` · ${item.mapelNama}` : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gf-judul">Judul kuis &amp; form</Label>
                <Input
                  id="gf-judul"
                  value={judul}
                  maxLength={120}
                  onChange={(e) => setJudul(e.target.value)}
                />
              </div>
              {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
            </div>

            <DialogFooter>
              <Button onClick={buat} disabled={pending || !ruangId}>
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                Buat kuis &amp; script
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Script siap ditempel</DialogTitle>
              <DialogDescription>
                Buka{" "}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  script.google.com
                </a>{" "}
                → Proyek baru → tempel seluruh script di bawah → jalankan fungsi{" "}
                <code className="rounded bg-muted px-1 text-xs">buatDanPasang</code> sekali
                (izinkan akses saat diminta). URL form akan muncul — tempel ke kolom
                di bawah.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  readOnly
                  value={script}
                  rows={10}
                  className="w-full rounded-md border border-border bg-muted/40 p-3 font-mono text-[0.7rem] leading-relaxed text-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(script);
                    setTersalin(true);
                  }}
                >
                  {tersalin ? <CheckIcon /> : <CopyIcon />}
                  {tersalin ? "Tersalin" : "Salin"}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gf-url">URL form (dari popup script)</Label>
                <div className="flex gap-2">
                  <Input
                    id="gf-url"
                    placeholder="https://docs.google.com/forms/d/…"
                    value={urlForm}
                    onChange={(e) => {
                      setUrlForm(e.target.value);
                      setTersimpan(false);
                    }}
                  />
                  <Button variant="outline" onClick={simpanUrl} disabled={pending}>
                    Simpan
                  </Button>
                </div>
                {tersimpan ? (
                  <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckIcon className="size-3" /> URL tersimpan. Kuis masih draf —
                    atur jadwal lalu terbitkan di halaman kuis.
                  </p>
                ) : null}
              </div>

              {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
            </div>

            <DialogFooter className={cn("items-center gap-2")}>
              {kuisId && ruangId ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={`/guru/ruang/${ruangId}/kuis/${kuisId}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon />
                  Buka kuis
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setTerbuka(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
