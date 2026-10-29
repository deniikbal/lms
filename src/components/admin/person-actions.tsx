"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";

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
import { Button, buttonVariants } from "@/components/ui/button";

type Action = (formData: FormData) => Promise<void>;
type DialogKind = "reset" | "delete";

/**
 * Row actions as icon buttons.
 *
 * Three text buttons per row turned a 25-row table into a wall of borders; icons
 * keep the last column quiet while the confirmation dialogs stay explicit.
 *
 * The actions are invoked directly rather than through `<form action>` so the
 * list can refetch once they finish — the table's rows live in client state now,
 * so a server-side `revalidatePath` alone would not refresh them.
 */
export function PersonActions({
  id,
  name,
  username,
  idLabel,
  editHref,
  onEdit,
  resetAction,
  deleteAction,
  onChanged,
}: {
  id: string;
  name: string;
  username: string | null;
  /** What the login identifier is called for this role — NISN or NIP. */
  idLabel: string;
  editHref?: string;
  onEdit?: () => void;
  resetAction: Action;
  deleteAction: Action;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState<DialogKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean, kind: DialogKind) {
    setOpen(next ? kind : null);
    if (!next) setError(null);
  }

  function run(action: Action) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", id);
        await action(formData);
        setOpen(null);
        setError(null);
        onChanged?.();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Gagal memproses. Coba lagi.",
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Ubah ${name}`}
          title="Ubah"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground"
        >
          <PencilIcon />
        </Button>
      ) : editHref ? (
        <Link
          href={editHref}
          aria-label={`Ubah ${name}`}
          title="Ubah"
          className={buttonVariants({
            variant: "ghost",
            size: "icon-sm",
            className: "text-muted-foreground hover:text-foreground",
          })}
        >
          <PencilIcon />
        </Link>
      ) : null}

      <AlertDialog
        open={open === "reset"}
        onOpenChange={(next) => handleOpenChange(next, "reset")}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Reset password ${name}`}
              title="Reset password"
              className="text-muted-foreground hover:text-foreground"
            />
          }
        >
          <KeyRoundIcon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Password akan diubah menjadi {idLabel} ({username ?? "—"}). Sesi
              yang sedang berjalan tidak ikut terhapus.
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
              size="sm"
              disabled={pending}
              onClick={() => run(resetAction)}
            >
              {pending ? "Memproses…" : "Reset password"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={open === "delete"}
        onOpenChange={(next) => handleOpenChange(next, "delete")}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Hapus ${name}`}
              title="Hapus"
              className="text-muted-foreground hover:text-destructive"
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun, kredensial, dan sesi ini dihapus permanen. Tindakan ini
              tidak bisa dibatalkan.
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
              onClick={() => run(deleteAction)}
            >
              {pending ? "Menghapus…" : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
