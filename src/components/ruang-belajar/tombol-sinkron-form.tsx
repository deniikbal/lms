"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import { sinkronGoogleFormAction } from "@/app/actions/google-form";
import { Button } from "@/components/ui/button";

/**
 * Manual pull for a Google Form quiz. The results page already syncs on load;
 * this is for the teacher watching responses come in live.
 */
export function TombolSinkronForm({
  ruangId,
  kuisId,
}: {
  ruangId: number;
  kuisId: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {pesan ? <span className="text-[0.7rem] text-muted-foreground">{pesan}</span> : null}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setPesan(null);
          startTransition(async () => {
            const hasil = await sinkronGoogleFormAction({ ruangId, kuisId });
            if (hasil.error) {
              setPesan(hasil.error);
              return;
            }
            setPesan(
              hasil.baru > 0
                ? `${hasil.baru} jawaban baru masuk`
                : hasil.tanpaNis > 0
                  ? `${hasil.tanpaNis} respons tanpa NIS valid`
                  : "Belum ada jawaban baru",
            );
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
        Sinkron jawaban
      </Button>
    </div>
  );
}
