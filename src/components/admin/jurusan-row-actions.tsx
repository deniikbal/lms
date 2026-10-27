"use client";

import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { deleteJurusanAction } from "@/app/actions/jurusan";
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
 * Ubah / hapus for one major row.
 *
 * Delete is confirmed in a dialog, and the server's refusal ("still used by a
 * class") is rendered inside that same dialog so the admin keeps the context of
 * which major they tried to remove.
 */
export function JurusanRowActions({
  id,
  kode,
  nama,
  kelasCount,
  onEdit,
  onDeleted,
}: {
  id: number;
  kode: string;
  nama: string;
  kelasCount: number;
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
      const result = await deleteJurusanAction({ error: null }, formData);
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
        aria-label={`Ubah ${kode}`}
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
              aria-label={`Hapus ${kode}`}
              title="Hapus"
              className="text-muted-foreground hover:text-destructive"
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus jurusan {kode} — {nama}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {kelasCount > 0
                ? `Jurusan ini dipakai ${kelasCount} kelas, jadi belum bisa dihapus. Pindahkan kelasnya ke jurusan lain lebih dulu.`
                : "Jurusan ini belum dipakai kelas mana pun. Tindakan ini tidak bisa dibatalkan."}
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
