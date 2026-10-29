import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { SoalBankEditor } from "@/components/bank-soal/soal-bank-editor";
import { LoadingPanel } from "@/components/loading-panel";
import { getTopik, listSoalTopik } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Soal baru · Bank Soal · LMS Sekolah",
};

export default function SoalTopikBaruPage({
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

  // The preview column shows what the topic already holds, so the teacher can
  // tell at a glance what is missing instead of re-reading the topic page.
  const soal = await listSoalTopik(user.id, topikId);

  return (
    <div className="space-y-4">
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
          <span className="text-foreground">Soal baru</span>
        </nav>
        <h1 className="mt-1.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <PlusIcon className="size-4 text-muted-foreground" />
          Tulis soal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Masuk ke topik{" "}
          <span className="font-medium text-foreground">{topik.nama}</span>
          {topik.mapelNama ? ` · ${topik.mapelNama}` : ""}. Mapel dan topik sudah
          ditentukan, jadi cukup isi soalnya.
        </p>
      </header>

      <SoalBankEditor topik={topik} soal={soal} />
    </div>
  );
}