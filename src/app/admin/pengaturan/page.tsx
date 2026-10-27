import { Suspense } from "react";
import type { Metadata } from "next";

import { LoadingPanel } from "@/components/loading-panel";
import { PengaturanForm } from "@/components/admin/pengaturan-form";
import { TahunAjaranList } from "@/components/admin/tahun-ajaran-list";
import { fetchPengaturanAction } from "@/app/actions/pengaturan";
import { listTahunAjaranAction } from "@/app/actions/tahun-ajaran";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pengaturan Sekolah · LMS Sekolah",
};

export default function PengaturanPage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <PengaturanSection />
    </Suspense>
  );
}

async function PengaturanSection() {
  await requireRole("admin");
  const [data, tahunAjaranResult] = await Promise.all([
    fetchPengaturanAction(),
    listTahunAjaranAction(),
  ]);
  return (
    <div className="space-y-6">
      {/* Data Sekolah dan Tahun Ajaran sejajar, 1 row 2 column */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kolom Data Sekolah */}
        <div>
          <PengaturanForm initial={data} />
        </div>

        {/* Kolom Tahun Ajaran */}
        <div>
          <TahunAjaranList initial={tahunAjaranResult.rows} />
        </div>
      </div>
    </div>
  );
}