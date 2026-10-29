import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, FolderPenIcon } from "lucide-react";

import { FormTopik } from "@/components/bank-soal/form-topik";
import { LoadingPanel } from "@/components/loading-panel";
import { getTopik, listMapelBank } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ubah topik · Bank Soal · LMS Sekolah",
};

export default function UbahTopikPage({
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

  const [topik, mapel] = await Promise.all([
    getTopik(user.id, topikId),
    listMapelBank(user.id),
  ]);
  if (!topik) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-5">
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
          <span className="text-foreground">Ubah</span>
        </nav>
        <h1 className="mt-1.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <FolderPenIcon className="size-4 text-muted-foreground" />
          Ubah topik
        </h1>
        {topik.soal > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Mengganti nama topik ikut mengganti label pada {topik.soal} soalnya.
            Salinan yang sudah ada di kuis tidak berubah.
          </p>
        ) : null}
      </header>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <FormTopik mapel={mapel} topik={topik} />
      </div>
    </div>
  );
}