"use client";

import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { deleteKelasAction } from "@/app/actions/kelas";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Ubah / hapus for one class row.
 *
 * Delete is confirmed in a dialog and the server's refusal ("still has
 * students") is rendered inside that same dialog, so the admin does not lose
 * the context of which class they tried to remove.
 */
export function KelasRowActions({
  id,
  nama,
  siswaCount,
  onEdit,
  onDeleted,
}: {
  id: number;
  nama: string;
  siswaCount: number;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  function handleDelete() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      const result = await deleteKelasAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onDeleted();
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Ubah ${nama}`}
        title="Ubah"
        onClick={onEdit}
        className="text-muted-foreground hover:text-foreground"
      >
        <PencilIcon />
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Hapus ${nama}`}
              title="Hapus"
              className="text-muted-foreground hover:text-destructive"
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kelas {nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              {siswaCount > 0
                ? `Kelas ini masih berisi ${siswaCount} siswa, jadi belum bisa dihapus.`
                : "Ruang belajar dan pengumuman untuk kelas ini ikut terhapus. Tindakan ini tidak bisa dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Menghapus…" : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
