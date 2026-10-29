import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarPresensi } from "@/components/ruang-belajar/lembar-presensi";
import {
  aksesRuang,
  getPertemuanDetail,
  listPresensiSiswa,
} from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Presensi pertemuan · LMS Sekolah",
};

/** The same sheet the teacher fills, reached from Pembagian Mengajar. */
export default function AdminPresensiPage({
  params,
}: {
  params: Promise<{ id: string; pertemuanId: string }>;
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
  params: Promise<{ id: string; pertemuanId: string }>;
}) {
  const user = await requireRole("admin");

  const { id, pertemuanId } = await params;
  const ruangId = Number(id);
  const pid = Number(pertemuanId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(pid) || pid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  if (!akses) notFound();

  const pertemuan = await getPertemuanDetail(ruangId, pid);
  if (!pertemuan) notFound();

  const siswa = await listPresensiSiswa(akses.ruang.kelasId, pid);

  return (
    <LembarPresensi
      ruang={akses.ruang}
      pertemuan={pertemuan}
      siswa={siswa}
      base={`/admin/ruang/${ruangId}`}
    />
  );
}
