import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JurusanDirectory } from "@/components/admin/jurusan-directory";
import { Skeleton } from "@/components/ui/skeleton";
import { getJenjang } from "@/lib/kelas";
import { jenjangPunyaJurusan, listJurusanPage, summariseJurusan } from "@/lib/jurusan";
import { JURUSAN_PER_PAGE } from "@/lib/jurusan-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Jurusan · LMS Sekolah",
};

export default function JurusanPage() {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Jurusan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jurusan yang dipakai kelas, beserta jumlah kelas di dalamnya. Hanya ada
          untuk jenjang SMA dan SMK — kolom Jurusan di form kelas ikut hilang
          untuk SD dan SMP.
        </p>
      </header>

      <Suspense fallback={<JurusanSkeleton />}>
        <JurusanSection />
      </Suspense>
    </>
  );
}

async function JurusanSection() {
  await requireRole("admin");

  const jenjang = await getJenjang();
  // For SD/SMP the menu is hidden, so the route should not exist either.
  if (!jenjangPunyaJurusan(jenjang)) notFound();

  const [data, stats] = await Promise.all([
    listJurusanPage({ page: 1, perPage: JURUSAN_PER_PAGE }),
    summariseJurusan(),
  ]);

  return <JurusanDirectory initial={{ ...data, stats }} jenjang={jenjang} />;
}

function JurusanSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-7">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-5 w-24" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="h-10 border-b border-border/60 bg-muted/30" />
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
