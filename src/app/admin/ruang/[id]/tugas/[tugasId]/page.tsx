import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarTugas } from "@/components/ruang-belajar/lembar-tugas";
import {
  aksesRuang,
  getTugasDetail,
  listAnggota,
  listPengumpulan,
  listPengumpulanKelompok,
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

  const [pengumpulan, kelompok, anggota] = await Promise.all([
    listPengumpulan(tid, akses.ruang.kelasId),
    tugas.tipeKerja === "kelompok"
      ? listPengumpulanKelompok(tid, akses.ruang.kelasId)
      : Promise.resolve([]),
    tugas.tipeKerja === "kelompok"
      ? listAnggota(akses.ruang.kelasId)
      : Promise.resolve([]),
  ]);

  return (
    <LembarTugas
      ruang={akses.ruang}
      tugas={tugas}
      pengumpulan={pengumpulan}
      kelompok={kelompok}
      anggota={anggota}
      base={`/admin/ruang/${ruangId}`}
    />
  );
}
