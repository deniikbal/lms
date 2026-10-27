import { Suspense } from "react";
import type { Metadata } from "next";

import { TeacherDirectory } from "@/components/admin/teacher-directory";
import { Skeleton } from "@/components/ui/skeleton";
import { listPeople, summarisePeople } from "@/lib/people";
import { GURU_PER_PAGE } from "@/lib/people-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Data Guru · LMS Sekolah",
};

type SearchParams = Promise<{ q?: string }>;

export default function TeachersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Data Guru
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil, wali kelas, dan status akun guru. NIP dipakai sebagai username
          untuk login.
        </p>
      </header>

      <Suspense fallback={<TeachersSkeleton />}>
        <TeacherSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TeacherSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin");

  const params = await searchParams;

  // Read once as the starting point; after this the search term lives in
  // component state and never touches the URL.
  const initialQ = typeof params.q === "string" ? params.q : "";

  const [summary, initial] = await Promise.all([
    summarisePeople("guru"),
    listPeople({ role: "guru", q: initialQ, page: 1, perPage: GURU_PER_PAGE }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 [&>*+*]:border-l [&>*+*]:border-border/60 [&>*+*]:pl-7">
        <Stat value={summary.total} label="Total guru" />
        <Stat value={summary.aktif} label="Akun aktif" />
        <Stat value={summary.nonaktif} label="Nonaktif" />
        <Stat value={summary.waliKelas} label="Wali kelas" />
      </div>

      <TeacherDirectory initial={initial} initialQ={initialQ} />
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

function TeachersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-7">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
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
