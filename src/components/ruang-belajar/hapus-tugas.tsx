"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { hapusTugasAction } from "@/app/actions/ruang-belajar";
import {
  AlertDialog,
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
 * Delete for a task with no submissions yet.
 *
 * Same double gate as the meeting delete: the UI hides the button when the row
 * counts say otherwise, and the SQL refuses to delete a task that gained a
 * submission or a grade after this page was rendered.
 */
export function HapusTugas({
  ruangId,
  tugasId,
  boleh,
  terkumpul,
  dinilai,
  redirect,
}: {
  ruangId: number;
  tugasId: number;
  boleh: boolean;
  terkumpul: number;
  dinilai: number;
  /** Where to go after a successful delete, e.g. `/guru/ruang/73?tab=tugas`. */
  redirect?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!boleh || terkumpul > 0 || dinilai > 0) return null;

  function hapus() {
    setError(null);
    startTransition(async () => {
      const hasil = await hapusTugasAction({ ruangId, tugasId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setOpen(false);
      if (redirect) router.push(redirect);
      router.refresh();
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus tugas"
          >
            <Trash2Icon className="size-3.5" />
            Hapus
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Belum ada siswa yang mengumpulkan atau dinilai, jadi aman dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button type="button" variant="outline" />}>
            Batal
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={hapus}
            disabled={pending}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Hapus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
