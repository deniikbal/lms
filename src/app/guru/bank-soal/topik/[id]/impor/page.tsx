import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, UploadIcon } from "lucide-react";

import { ImporBankTeks } from "@/components/bank-soal/impor-bank-teks";
import { LoadingPanel } from "@/components/loading-panel";
import { getTopik } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Impor teks · Bank Soal · LMS Sekolah",
};

export default function ImporTopikPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="form" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("guru");
  const { id } = await params;
  const topikId = Number(id);
  if (!Number.isInteger(topikId) || topikId <= 0) notFound();

  const topik = await getTopik(user.id, topikId);
  if (!topik) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <nav
          aria-label="Remah roti"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href="/guru/bank-soal"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Bank Soal
          </Link>
          <ChevronRightIcon className="size-3" />
          <Link
            href={`/guru/bank-soal/topik/${topik.id}`}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {topik.nama}
          </Link>
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Impor teks</span>
        </nav>
        <h1 className="mt-1.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <UploadIcon className="size-4 text-muted-foreground" />
          Tempel banyak soal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tempel soal dari dokumen atau bank soal lain. Formatnya sama dengan
          editor kuis.
        </p>
      </header>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <ImporBankTeks topik={topik} />
      </div>
    </div>
  );
}