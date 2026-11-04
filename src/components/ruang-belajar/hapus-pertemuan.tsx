"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { hapusPertemuanAction } from "@/app/actions/ruang-belajar";
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
 * Delete for a meeting with no attendance yet.
 *
 * The gating is done twice on purpose: the sheet hides the button when `tercatat`
 * says otherwise, and the action re-checks in SQL so a stale page cannot delete a
 * meeting whose attendance arrived in the meantime. Failure shows as a message,
 * not a dead click.
 */
export function HapusPertemuan({
  ruangId,
  pertemuanId,
  boleh,
  tercatat,
}: {
  ruangId: number;
  pertemuanId: number;
  boleh: boolean;
  tercatat: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Hidden, not disabled: a disabled button next to nothing to fill reads as
  // broken, while its absence just says "nothing to do here".
  if (!boleh || tercatat > 0) return null;

  function hapus() {
    setError(null);
    startTransition(async () => {
      const hasil = await hapusPertemuanAction({ ruangId, pertemuanId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setOpen(false);
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
            aria-label="Hapus pertemuan"
          >
            <Trash2Icon className="size-3.5" />
            Hapus
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pertemuan ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Belum ada presensi yang tercatat, jadi aman dihapus. Materi dan
            pengaturan ikut hilang.
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
