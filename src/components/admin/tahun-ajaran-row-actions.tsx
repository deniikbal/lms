"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteTahunAjaranAction, type TahunAjaranRow } from "@/app/actions/tahun-ajaran";
import { Button } from "@/components/ui/button";

export function TahunAjaranRowActions({
  row,
  onEdit,
  onDeleted,
}: {
  row: TahunAjaranRow;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Hapus tahun ajaran "${row.nama}"? Data terkait kelas mungkin ikut terpengaruh.`)) {
      return;
    }

    setDeleting(true);
    const formData = new FormData();
    formData.append("id", String(row.id));

    const result = await deleteTahunAjaranAction({ error: null }, formData);

    if (result.error) {
      alert(`Gagal menghapus: ${result.error}`);
    } else {
      alert("Tahun ajaran berhasil dihapus.");
      onDeleted();
    }
    setDeleting(false);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        disabled={deleting}
        aria-label="Ubah"
      >
        <Pencil className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Hapus"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}