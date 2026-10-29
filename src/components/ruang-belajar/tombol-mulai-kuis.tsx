"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlayIcon } from "lucide-react";

import { mulaiKuisAction } from "@/app/actions/kuis";
import { Button } from "@/components/ui/button";

/**
 * Starts (or resumes) a quiz, then hands over to the question screen.
 *
 * The action re-checks the window and the attempt on the server, so a stale tab
 * cannot open a quiz that has already closed.
 */
export function TombolMulaiKuis({
  ruangId,
  kuisId,
  alamatKerjakan,
  label,
}: {
  ruangId: number;
  kuisId: number;
  alamatKerjakan: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mulai() {
    setError(null);
    startTransition(async () => {
      const hasil = await mulaiKuisAction({ ruangId, kuisId });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      router.push(alamatKerjakan);
    });
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" onClick={mulai} disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
        {label}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
