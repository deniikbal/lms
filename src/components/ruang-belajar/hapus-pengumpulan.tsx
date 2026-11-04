"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { hapusPengumpulanAction } from "@/app/actions/ruang-belajar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Per-student delete on the teacher's submission sheet: wipes the answer text,
 * Drive files, grade and timestamp in one go, so the student can resubmit.
 * Gated by `boleh` (guru pengampu) on the sheet; the action re-checks in SQL.
 */
export function HapusPengumpulan({
  ruangId,
  tugasId,
  siswaId,
  nama,
  adaJawaban,
  boleh,
}: {
  ruangId: number;
  tugasId: number;
  siswaId: string;
  nama: string;
  adaJawaban: boolean;
  boleh: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!boleh || !adaJawaban) return null;

  function hapus() {
    setError(null);
    startTransition(async () => {
      const hasil = await hapusPengumpulanAction({ ruangId, tugasId, siswaId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus pengumpulan ${nama}`}
            title="Hapus pengumpulan"
            className="text-muted-foreground hover:text-destructive"
            disabled={pending}
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pengumpulan {nama}?</AlertDialogTitle>
          <AlertDialogDescription>
            Seluruh jawaban siswa ini dihapus: berkas di Google Drive, jawaban
            teks, nilai, dan waktu pengumpulan. Siswa kembali ke status belum
            mengumpulkan dan bisa mengirim ulang. Tindakan ini tidak bisa
            dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              hapus();
            }}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
