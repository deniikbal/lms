"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SendIcon } from "lucide-react";

import { kirimDiskusiAction } from "@/app/actions/ruang-belajar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Post a question or reply into the room. */
export function DiskusiForm({ ruangId }: { ruangId: number }) {
  const router = useRouter();
  const [isi, setIsi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const hasil = await kirimDiskusiAction({ ruangId, isi });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      setIsi("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="diskusi-isi" className="sr-only">
        Tulis pesan
      </Label>
      <textarea
        id="diskusi-isi"
        value={isi}
        onChange={(event) => {
          setIsi(event.target.value);
          setError(null);
        }}
        rows={3}
        maxLength={2000}
        placeholder="Tulis pertanyaan atau tanggapan…"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      />

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !isi.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Kirim
        </Button>
      </div>
    </form>
  );
}
