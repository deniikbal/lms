import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarTugas } from "@/components/ruang-belajar/lembar-tugas";
import {
  aksesRuang,
  getTugasDetail,
  listPengumpulan,
} from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pengumpulan tugas · LMS Sekolah",
};

/** The same submission sheet the teacher sees, reached from Pembagian Mengajar. */
export default function AdminTugasPage({
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
  const user = await requireRole("admin");

  const { id, tugasId } = await params;
  const ruangId = Number(id);
  const tid = Number(tugasId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(tid) || tid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  if (!akses) notFound();

  const tugas = await getTugasDetail(ruangId, tid);
  if (!tugas) notFound();

  const pengumpulan = await listPengumpulan(tid, akses.ruang.kelasId);

  return (
    <LembarTugas
      ruang={akses.ruang}
      tugas={tugas}
      pengumpulan={pengumpulan}
      base={`/admin/ruang/${ruangId}`}
    />
  );
}
