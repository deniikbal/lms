"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";

import { simpanNilaiTugasAction } from "@/app/actions/ruang-belajar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  pecahBerkas,
  type PengumpulanRow,
} from "@/lib/ruang-belajar-shared";

/**
 * Drive's `/view` link sends `X-Frame-Options: SAMEORIGIN`, so an iframe gets
 * "Anda memerlukan akses" even when the file is public. `/preview` serves the
 * same document in an embeddable player — that is the form made for iframes.
 */
function toPreviewUrl(url: string): string {
  const cocok = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  // `embedded=true` menyembunyikan bar atas Drive (yang berisi tombol
  // pop-out "Lepas"). Tanpa itu, iframe menampilkan tombol bawaan Drive
  // di pojok kanan atas modal.
  return cocok
    ? `https://drive.google.com/file/d/${cocok[1]}/preview?embedded=true`
    : url;
}

/**
 * File viewer with an inline grade form, for one student's submission.
 *
 * The PDF fills the modal edge to edge — `p-0` and no header — so reading it is
 * like opening the tab itself, and grading never leaves the page: the form is a
 * small strip floating over the document, not a second step.
 */
export function LihatBerkasNilai({
  ruangId,
  tugasId,
  pengumpulan,
}: {
  ruangId: number;
  tugasId: number;
  pengumpulan: PengumpulanRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nilai, setNilai] = useState(pengumpulan.nilai ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);
  const [pending, startTransition] = useTransition();

  // A submission may hold several files (multi-photo tasks); the tabs switch
  // between them inside one modal.
  const tautan = pecahBerkas(pengumpulan.fileUrl);
  const [indeks, setIndeks] = useState(0);
  const berkasKini = tautan[Math.min(indeks, tautan.length - 1)];

  const angka = String(nilai).trim();
  const sah =
    angka === "" ||
    (Number.isInteger(Number(angka)) && Number(angka) >= 0 && Number(angka) <= 100);

  function simpan() {
    setError(null);
    setSukses(false);
    startTransition(async () => {
      const hasil = await simpanNilaiTugasAction({
        ruangId,
        tugasId,
        entri: [
          {
            siswaId: pengumpulan.siswaId,
            nilai: angka === "" ? null : Number(angka),
          },
        ],
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setSukses(true);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Lihat berkas ${pengumpulan.nama}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Berkas
          </button>
        }
      />

      {/* Tanpa border/ring: dokumen jadi modal, hanya close di pojok kanan atas. */}
      <DialogContent
        showCloseButton
        className="max-h-[92vh] gap-0 overflow-hidden rounded-xl border-0 p-0 ring-0 sm:max-w-3xl"
      >
        <div className="relative flex h-[92vh] flex-col">
          {tautan.length > 1 ? (
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tautan.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndeks(i)}
                  aria-label={`Berkas ${i + 1}`}
                  className={cn(
                    "size-7 shrink-0 rounded-md text-xs font-medium tabular-nums transition-colors",
                    i === Math.min(indeks, tautan.length - 1)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : null}

          {berkasKini ? (
            <iframe
              src={toPreviewUrl(berkasKini)}
              title={`Tugas ${pengumpulan.nama} — berkas ${indeks + 1}`}
              className="h-full w-full flex-1 border-0 bg-muted/20"
            />
          ) : null}

          {/* Grade strip: floats over the document, bottom edge. */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card/95 px-3 py-2.5 backdrop-blur">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {pengumpulan.nama}
            </span>

            {sukses && !error ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <CheckIcon className="size-3.5" />
                Tersimpan
              </span>
            ) : null}
            {error ? (
              <span className="text-xs text-destructive" role="alert">
                {error}
              </span>
            ) : null}

            <Input
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              aria-label={`Nilai ${pengumpulan.nama}`}
              disabled={pending}
              placeholder="Nilai 0–100"
              value={nilai}
              onChange={(event) => {
                setNilai(event.target.value);
                setSukses(false);
                setError(null);
              }}
              onKeyDown={(event) => {
                // Enter di kolom nilai = simpan.
                if (event.key === "Enter") {
                  event.preventDefault();
                  simpan();
                }
              }}
              className={cn(
                "h-9 w-32 shrink-0 tabular-nums",
                !sah && "border-destructive",
              )}
            />
            <Button
              type="button"
              size="sm"
              onClick={simpan}
              disabled={pending || !sah}
              className="shrink-0"
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Simpan nilai
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
