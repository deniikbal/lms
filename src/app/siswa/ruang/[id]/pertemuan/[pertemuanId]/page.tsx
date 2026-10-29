import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarPertemuanSiswa } from "@/components/ruang-belajar/lembar-pertemuan-siswa";
import { aksesRuang, getPertemuanSiswa } from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pertemuan · LMS Sekolah",
};

export default function SiswaPertemuanPage({
  params,
}: {
  params: Promise<{ id: string; pertemuanId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="papan" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({
  params,
}: {
  params: Promise<{ id: string; pertemuanId: string }>;
}) {
  const user = await requireRole("siswa");

  const { id, pertemuanId } = await params;
  const ruangId = Number(id);
  const pid = Number(pertemuanId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(pid) || pid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  // A room from another class must be indistinguishable from a missing one.
  if (!akses) notFound();

  const pertemuan = await getPertemuanSiswa({
    ruangId,
    pertemuanId: pid,
    siswaId: user.id,
    kelasId: akses.ruang.kelasId,
  });
  if (!pertemuan) notFound();

  // A draft is the teacher's working copy. The Materi list already hides it, so
  // a hand-typed URL must not open it either.
  if (!pertemuan.terbit) notFound();

  return (
    <LembarPertemuanSiswa
      ruang={akses.ruang}
      pertemuan={pertemuan}
      base={`/siswa/ruang/${ruangId}`}
    />
  );
}
