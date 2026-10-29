"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { hapusTopikAction } from "@/app/actions/bank-soal";
import { Button } from "@/components/ui/button";

/**
 * Deletes a topic — and its questions with it.
 *
 * Inline confirmation rather than a dialog because the sentence that matters
 * ("12 soal ikut terhapus, salinan di kuis tetap ada") has to be read, and a
 * dialog button is easy to press while that sentence is still unread.
 */
export function HapusTopikButton({
  topikId,
  nama,
  soal,
  dipakai,
}: {
  topikId: number;
  nama: string;
  soal: number;
  dipakai: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [yakin, setYakin] = useState(false);

  if (!yakin) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setYakin(true)}>
        <Trash2Icon />
        Hapus topik
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5">
      <span className="text-[0.7rem] text-destructive">
        Hapus “{nama}”
        {soal > 0 ? ` beserta ${soal} soalnya` : ""}?
        {dipakai > 0
          ? ` ${dipakai} salinan di kuis tetap ada dan tetap dinilai.`
          : ""}
      </span>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await hapusTopikAction({ topikId });
            router.push("/guru/bank-soal");
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Ya, hapus
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setYakin(false)}>
        Batal
      </Button>
    </div>
  );
}
