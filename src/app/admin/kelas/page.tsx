import { Suspense } from "react";
import type { Metadata } from "next";

import { KelasDirectory } from "@/components/admin/kelas-directory";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getJenjang,
  listJurusan,
  listKelasPage,
  listWali,
  summariseKelas,
} from "@/lib/kelas";
import { KELAS_PER_PAGE } from "@/lib/kelas-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kelas · LMS Sekolah",
};

export default function KelasPage() {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Kelas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar kelas beserta wali kelas, jumlah siswa, dan jumlah mapel yang
          sudah punya ruang belajar.
        </p>
      </header>

      <Suspense fallback={<KelasSkeleton />}>
        <KelasSection />
      </Suspense>
    </>
  );
}

async function KelasSection() {
  await requireRole("admin");

  const [jenjang, jurusan, wali, data, stats] = await Promise.all([
    getJenjang(),
    listJurusan(),
    listWali(),
    listKelasPage({ page: 1, perPage: KELAS_PER_PAGE }),
    summariseKelas(),
  ]);

  return (
    <KelasDirectory
      initial={{ ...data, stats }}
      jenjang={jenjang}
      jurusan={jurusan}
      wali={wali}
    />
  );
}

function KelasSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-7">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="h-10 border-b border-border/60 bg-muted/30" />
        <div className="divide-y divide-border/60">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
