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
 * Delete for a meeting.
 *
 * With no attendance the meeting goes quietly, as before. Once attendance
 * exists the same button becomes a wipe: the teacher is told exactly how many
 * attendance rows and completion marks go with it, and the action re-checks
 * authorization in SQL.
 */
export function HapusPertemuan({
  ruangId,
  pertemuanId,
  boleh,
  tercatat,
  jumlahSelesai = 0,
}: {
  ruangId: number;
  pertemuanId: number;
  boleh: boolean;
  /** Attendance rows recorded for this meeting. */
  tercatat: number;
  /** Students who marked the material as done. */
  jumlahSelesai?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!boleh) return null;

  const adaData = tercatat > 0 || jumlahSelesai > 0;

  function hapus() {
    setError(null);
    startTransition(async () => {
      const hasil = await hapusPertemuanAction({ ruangId, pertemuanId, paksa: adaData });
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
            {adaData ? (
              <>
                Pertemuan ini sudah punya data. Menghapusnya juga menghapus{" "}
                <strong className="font-medium text-foreground">
                  {tercatat} baris presensi
                </strong>
                {jumlahSelesai > 0 ? (
                  <>
                    {" dan "}
                    <strong className="font-medium text-foreground">
                      {jumlahSelesai} tanda selesai
                    </strong>
                  </>
                ) : null}
                . Tindakan ini tidak bisa dibatalkan.
              </>
            ) : (
              <>Belum ada presensi yang tercatat, jadi aman dihapus. Materi dan pengaturan ikut hilang.</>
            )}
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
            {adaData ? "Hapus semua" : "Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
