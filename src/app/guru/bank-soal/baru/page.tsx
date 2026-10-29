import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, FolderPlusIcon } from "lucide-react";

import { FormTopik } from "@/components/bank-soal/form-topik";
import { LoadingPanel } from "@/components/loading-panel";
import { listMapelBank } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Topik baru · Bank Soal · LMS Sekolah",
};

export default function TopikBaruPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="form" />}>
      <Isi searchParams={searchParams} />
    </Suspense>
  );
}

async function Isi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("guru");
  const mentah = await searchParams;
  const mapelAwal = Number(typeof mentah.mapel === "string" ? mentah.mapel : "");

  const mapel = await listMapelBank(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <nav
          aria-label="Remah roti"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href="/guru/bank-soal"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Bank Soal
          </Link>
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Topik baru</span>
        </nav>
        <h1 className="mt-1.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <FolderPlusIcon className="size-4 text-muted-foreground" />
          Buat topik
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Topik adalah wadah soal. Setelah dibuat, Anda langsung masuk ke dalamnya
          untuk mengisi soal — nama dan mapelnya tidak perlu diisi lagi.
        </p>
      </header>

      <div className="rounded-xl border border-border/70 bg-card p-4">
        <FormTopik
          mapel={mapel}
          awalMapel={Number.isInteger(mapelAwal) && mapelAwal > 0 ? mapelAwal : null}
        />
      </div>
    </div>
  );
}