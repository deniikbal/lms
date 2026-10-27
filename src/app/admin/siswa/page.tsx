import { Suspense } from "react";
import type { Metadata } from "next";

import { StudentDirectory } from "@/components/admin/student-directory";
import { Skeleton } from "@/components/ui/skeleton";
import { listKelas, listPeople, summarisePeople } from "@/lib/people";
import { SISWA_PER_PAGE } from "@/lib/people-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Data Siswa · LMS Sekolah",
};

type SearchParams = Promise<{ q?: string; kelas?: string }>;

export default function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Data Siswa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil, kelas, dan status akun siswa. NISN dipakai sebagai username
          untuk login.
        </p>
      </header>

      <Suspense fallback={<StudentsSkeleton />}>
        <StudentSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StudentSection({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("admin");

  const params = await searchParams;

  // Read once as the starting point so links like `/admin/siswa?kelas=4` from
  // the Kelas screen still land on a filtered list. After this the filters live
  // in component state and never touch the URL.
  const initialQ = typeof params.q === "string" ? params.q : "";
  const initialKelas =
    typeof params.kelas === "string" && /^\d+$/.test(params.kelas)
      ? Number(params.kelas)
      : null;

  const [kelas, summary, initial] = await Promise.all([
    listKelas(),
    summarisePeople("siswa"),
    listPeople({
      role: "siswa",
      q: initialQ,
      kelasId: initialKelas,
      page: 1,
      perPage: SISWA_PER_PAGE,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 [&>*+*]:border-l [&>*+*]:border-border/60 [&>*+*]:pl-7">
        <Stat value={summary.total} label="Total siswa" />
        <Stat value={summary.aktif} label="Akun aktif" />
        <Stat value={summary.nonaktif} label="Nonaktif" />
        <Stat value={summary.tanpaKelas} label="Tanpa kelas" />
      </div>

      <StudentDirectory
        initial={initial}
        kelas={kelas}
        initialQ={initialQ}
        initialKelas={initialKelas}
      />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StudentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-7">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="h-10 border-b border-border/60 bg-muted/30" />
        <div className="divide-y divide-border/60">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
