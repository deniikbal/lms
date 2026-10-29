"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, PencilLineIcon } from "lucide-react";

import { simpanMateriAction } from "@/app/actions/ruang-belajar";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAKS = 8000;

/**
 * The teacher's editor for a meeting's written material.
 *
 * A dialog rather than an always-open textarea: the material is read far more
 * often than it is written, and a 10-row box parked on the page would push the
 * attendance grid — the actual job of that page — below the fold.
 */
export function TulisMateri({
  ruangId,
  pertemuanId,
  materi,
}: {
  ruangId: number;
  pertemuanId: number;
  materi: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isi, setIsi] = useState(materi ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ada = Boolean(materi?.trim());

  function buka(next: boolean) {
    setOpen(next);
    // Closing without saving must not leave the abandoned draft in the box for
    // the next open — the dialog always starts from what is actually stored.
    if (!next) {
      setIsi(materi ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const hasil = await simpanMateriAction({ ruangId, pertemuanId, materi: isi });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={buka}>
      <DialogTrigger
        render={<Button type="button" size="sm" variant={ada ? "ghost" : "outline"} />}
      >
        <PencilLineIcon />
        {ada ? "Ubah materi" : "Tulis materi"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Materi pertemuan</DialogTitle>
          <DialogDescription>
            Teks ini tampil di halaman pertemuan siswa. Baris baru dipertahankan;
            kosongkan untuk menghapus.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-2">
          <Label htmlFor="materi-isi" className="sr-only">
            Materi pertemuan
          </Label>
          <textarea
            id="materi-isi"
            value={isi}
            rows={12}
            maxLength={MAKS}
            autoFocus
            onChange={(event) => {
              setIsi(event.target.value);
              setError(null);
            }}
            placeholder={"Tulis tujuan pembelajaran, ringkasan, atau langkah kegiatan…"}
            className={cn(
              "w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            )}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {isi.length}/{MAKS}
            </p>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => buka(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              Simpan materi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The material as a reader sees it.
 *
 * Plain text, never HTML: the teacher types prose, and `whitespace-pre-line`
 * keeps the paragraphs they wrote without opening an injection path.
 */
export function BacaMateri({ materi }: { materi: string }) {
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
      {materi}
    </p>
  );
}
