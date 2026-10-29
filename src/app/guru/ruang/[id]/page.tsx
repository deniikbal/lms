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

export default function GuruRuangPage({
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
  const user = await requireRole("guru");

  const { id } = await params;
  const ruangId = Number(id);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  // Not the assigned teacher → treat it as missing, so the URL does not confirm
  // that somebody else's room exists.
  if (!akses) notFound();

  const { tab } = await searchParams;
  const aktif: TabKey = isTabKey(tab) ? tab : "materi";

  return (
    <RuangShell
      ruang={akses.ruang}
      peran={akses.peran}
      aktif={aktif}
      base={`/guru/ruang/${ruangId}`}
      daftarHref="/guru/ruang"
      userId={user.id}
    />
  );
}
