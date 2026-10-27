import { Suspense } from "react";
import type { Metadata } from "next";

import { MapelDirectory } from "@/components/admin/mapel-directory";
import { Skeleton } from "@/components/ui/skeleton";
import { listMapelPage, summariseMapel } from "@/lib/mapel";
import { MAPEL_PER_PAGE } from "@/lib/mapel-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mata Pelajaran · LMS Sekolah",
};

export default function MapelPage() {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Mata Pelajaran
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar mapel beserta kelompoknya dan berapa ruang belajar yang
          memakainya. KKM dan bobot nilai diatur per ruang, bukan di sini.
        </p>
      </header>

      <Suspense fallback={<MapelSkeleton />}>
        <MapelSection />
      </Suspense>
    </>
  );
}

async function MapelSection() {
  await requireRole("admin");

  const [data, stats] = await Promise.all([
    listMapelPage({ page: 1, perPage: MAPEL_PER_PAGE }),
    summariseMapel(),
  ]);

  return <MapelDirectory initial={{ ...data, stats }} />;
}

function MapelSkeleton() {
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
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
