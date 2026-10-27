import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRangeIcon } from "lucide-react";

import { PembagianBoard } from "@/components/admin/pembagian-board";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoard, getTahunAktif, listKelasRingkas } from "@/lib/pembagian";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pembagian Mengajar · LMS Sekolah",
};

export default function PembagianPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>;
}) {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pembagian Mengajar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Menentukan mapel apa diajar siapa di kelas mana, plus jadwal dan link
          kelas daring.
        </p>
      </header>

      <Suspense fallback={<PembagianSkeleton />}>
        <PembagianSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PembagianSection({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>;
}) {
  await requireRole("admin");

  const ta = await getTahunAktif();
  if (!ta) return <TanpaTahunAjaran />;

  const kelasList = await listKelasRingkas();
  if (kelasList.length === 0) return <TanpaKelas />;

  // `?kelas=` comes from the class picker and from the deep links on the Kelas
  // and Mapel screens. An unknown or missing id falls back to the first class.
  const { kelas: wanted } = await searchParams;
  const diminta = Number(wanted);
  const kelas =
    kelasList.find((item) => item.id === diminta) ?? kelasList[0];

  const board = await getBoard(kelas.id, ta.id);
  if (!board) return <TanpaKelas />;

  return <PembagianBoard initial={board} kelasList={kelasList} />;
}

function TanpaTahunAjaran() {
  return (
    <Alert variant="destructive">
      <CalendarRangeIcon />
      <AlertTitle>Belum ada tahun ajaran aktif</AlertTitle>
      <AlertDescription>
        Pembagian mengajar selalu terikat ke satu tahun ajaran. Aktifkan salah
        satu di{" "}
        <Link href="/admin/tahun-ajaran" className="underline underline-offset-4">
          Tahun Ajaran
        </Link>{" "}
        dulu.
      </AlertDescription>
    </Alert>
  );
}

function TanpaKelas() {
  return (
    <Alert>
      <CalendarRangeIcon />
      <AlertTitle>Belum ada kelas</AlertTitle>
      <AlertDescription>
        Buat kelas dulu di{" "}
        <Link href="/admin/kelas" className="underline underline-offset-4">
          Kelas
        </Link>
        , baru mapel bisa dibagikan.
      </AlertDescription>
    </Alert>
  );
}

function PembagianSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="overflow-hidden rounded-xl border border-border/70">
          <div className="h-11 border-b border-border/60 bg-muted/30" />
          <div className="divide-y divide-border/60">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="ml-auto h-8 w-56 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
