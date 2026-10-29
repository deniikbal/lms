"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { hapusBankSoalAction } from "@/app/actions/bank-soal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Deletes a bank question.
 *
 * Confirmation is inline rather than a second dialog: it has to say what
 * happens to the quizzes that copied the question, and that sentence reads
 * best right next to the button.
 */
export function HapusBankButton({
  bankId,
  dipakai,
  ikon = false,
}: {
  bankId: number;
  dipakai: number;
  /** Icon-only, for rows that already carry their own labels. */
  ikon?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [yakin, setYakin] = useState(false);

  if (!yakin) {
    if (ikon) {
      return (
        <button
          type="button"
          aria-label="Hapus soal"
          onClick={() => setYakin(true)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors",
            "hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      );
    }
    return (
      <Button size="sm" variant="ghost" onClick={() => setYakin(true)}>
        <Trash2Icon />
        Hapus
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1">
      <span className="text-[0.7rem] text-muted-foreground">
        {dipakai > 0
          ? `${dipakai} kuis memakai salinan soal ini — salinannya tetap ada.`
          : "Hapus soal ini?"}
      </span>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await hapusBankSoalAction({ bankId });
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