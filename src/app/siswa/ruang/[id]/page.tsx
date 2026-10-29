import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { RuangShell } from "@/components/ruang-belajar/ruang-shell";
import { aksesRuang } from "@/lib/ruang-belajar";
import { isTabKey, type TabKey } from "@/lib/ruang-belajar-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ruang belajar · LMS Sekolah",
};

export default function SiswaRuangDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="detail" />}>
      <Isi params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Isi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireRole("siswa");

  const { id } = await params;
  const ruangId = Number(id);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  // A room from another class must be indistinguishable from a missing one.
  if (!akses) notFound();

  const { tab } = await searchParams;
  const diminta: TabKey = isTabKey(tab) ? tab : "materi";
  // Pengaturan is not in the student tab list; a hand-typed ?tab=pengaturan
  // falls back to Materi rather than rendering an empty panel.
  const aktif: TabKey = diminta === "pengaturan" ? "materi" : diminta;

  return (
    <RuangShell
      ruang={akses.ruang}
      peran={akses.peran}
      aktif={aktif}
      base={`/siswa/ruang/${ruangId}`}
      daftarHref="/siswa/ruang"
      userId={user.id}
    />
  );
}
