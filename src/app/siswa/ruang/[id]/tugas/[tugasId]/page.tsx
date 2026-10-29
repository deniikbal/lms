import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { HalamanTugasSiswa } from "@/components/ruang-belajar/halaman-tugas-siswa";
import {
  aksesRuang,
  getPengumpulanSiswa,
  getTugasDetail,
} from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tugas · LMS Sekolah",
};

export default function SiswaTugasPage({
  params,
}: {
  params: Promise<{ id: string; tugasId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="panel" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({
  params,
}: {
  params: Promise<{ id: string; tugasId: string }>;
}) {
  const user = await requireRole("siswa");

  const { id, tugasId } = await params;
  const ruangId = Number(id);
  const tid = Number(tugasId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(tid) || tid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  // A room from another class must be indistinguishable from a missing one.
  if (!akses) notFound();

  const tugas = await getTugasDetail(ruangId, tid);
  if (!tugas) notFound();
  // An unpublished task is the teacher's draft; a student sees it as missing.
  if (!tugas.terbit) notFound();

  const pengumpulan = await getPengumpulanSiswa(tid, user.id);

  return (
    <HalamanTugasSiswa
      ruang={akses.ruang}
      tugas={tugas}
      pengumpulan={pengumpulan}
      base={`/siswa/ruang/${ruangId}`}
    />
  );
}
