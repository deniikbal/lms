"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";

import { buatKuisGoogleFormAction } from "@/app/actions/google-form";
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
import type { RuangPilihan } from "@/lib/google-form";

/**
 * "Buat Google Form" — turns the topic into a quiz answered in Google Forms.
 *
 * The LMS itself calls the Forms API with the teacher's connected account: it
 * creates the form (quiz mode, NIS question first, answer keys set), links it
 * to a draft quiz, and hands back the responder URL. Responses are pulled back
 * when the results page is opened.
 */
export function GoogleFormDialog({
  topikId,
  namaTopik,
  ruang,
  terhubung,
}: {
  topikId: number;
  namaTopik: string;
  ruang: RuangPilihan[];
  /** False when the Google app is unconfigured or the account is not linked. */
  terhubung: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [terbuka, setTerbuka] = useState(false);
  const [ruangId, setRuangId] = useState(ruang[0] ? String(ruang[0].id) : "");
  const [judul, setJudul] = useState(namaTopik);
  const [galat, setGalat] = useState<string | null>(null);

  const [hasil, setHasil] = useState<{ kuisId: number; ruangId: number; formUrl: string } | null>(null);

  function buat() {
    setGalat(null);
    startTransition(async () => {
      const balikan = await buatKuisGoogleFormAction({
        topikId,
        ruangId: Number(ruangId),
        judul,
      });
      if (balikan.error || !balikan.kuisId || !balikan.ruangId || !balikan.formUrl) {
        setGalat(balikan.error ?? "Gagal membuat form.");
        return;
      }
      setHasil({ kuisId: balikan.kuisId, ruangId: balikan.ruangId, formUrl: balikan.formUrl });
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
      <DialogContent className="max-w-xl">
        {hasil === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Buat Google Form dari topik ini</DialogTitle>
              <DialogDescription>
                Semua soal di topik ini disalin ke kuis baru dan langsung dibuatkan
                form-nya di Google (mode kuis, pertanyaan NIS paling atas, kunci
                jawaban terpasang). Jawaban disinkut otomatis ke LMS.
              </DialogDescription>
            </DialogHeader>

            {!terhubung ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="text-sm text-foreground">
                  Akun Google Anda belum terhubung. Hubungkan sekali, setelah itu
                  form dibuat otomatis dari sini.
                </p>
                <Button size="sm" variant="outline" render={<a href="/api/google/connect" />}>
                  Hubungkan akun Google
                </Button>
              </div>
            ) : (
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
              </div>
            )}

            {galat ? <p className="text-sm text-destructive">{galat}</p> : null}

            <DialogFooter>
              {terhubung ? (
                <Button onClick={buat} disabled={pending || !ruangId}>
                  {pending ? <Loader2Icon className="animate-spin" /> : null}
                  Buat form
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Form berhasil dibuat</DialogTitle>
              <DialogDescription>
                Kuis masih draf — atur jadwal lalu terbitkan di halaman kuis.
                Jawaban masuk ke LMS otomatis saat lembar hasil dibuka.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <a
                href={hasil.formUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand underline underline-offset-4"
              >
                <ExternalLinkIcon className="size-3.5" />
                Buka form di Google
              </a>
              <p className="text-xs text-muted-foreground">
                Untuk mengedit soal atau melihat respons langsung di Google, buka
                form dari Drive Anda — judulnya “{judul}”.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                render={<a href={`/guru/ruang/${hasil.ruangId}/kuis/${hasil.kuisId}`} />}
              >
                Buka kuis
              </Button>
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
