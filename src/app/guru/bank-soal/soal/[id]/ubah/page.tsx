import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PencilIcon } from "lucide-react";

import { HapusBankButton } from "@/components/bank-soal/hapus-bank-button";
import { SoalBankEditor } from "@/components/bank-soal/soal-bank-editor";
import { LoadingPanel } from "@/components/loading-panel";
import { getBankSoal, getTopik, listSoalTopik } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ubah soal · Bank Soal · LMS Sekolah",
};

export default function UbahSoalPage({
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
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) notFound();

  const soal = await getBankSoal(user.id, bankId);
  if (!soal) notFound();

  const topik = soal.topikId ? await getTopik(user.id, soal.topikId) : null;
  if (!topik) notFound();

  const daftar = await listSoalTopik(user.id, topik.id);

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
          <span className="text-foreground">Soal #{soal.id}</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <PencilIcon className="size-4 text-muted-foreground" />
              Ubah soal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Perubahan tidak otomatis masuk ke kuis yang sudah menyalin soal ini.
            </p>
          </div>
          <HapusBankButton bankId={soal.id} dipakai={soal.dipakai} />
        </div>
      </header>

      <SoalBankEditor
        topik={topik}
        soal={daftar}
        awal={{
          bankId: soal.id,
          jenis: soal.jenis,
          pertanyaan: soal.pertanyaan,
          pilihan: soal.pilihan,
          kunci: soal.jawaban,
          bobot: String(soal.bobot),
        }}
      />
    </div>
  );
}