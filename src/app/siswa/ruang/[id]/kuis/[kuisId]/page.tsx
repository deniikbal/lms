import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { HalamanKuisSiswa } from "@/components/ruang-belajar/halaman-kuis-siswa";
import { aksesRuang, getKuisDetail, getPercobaanSiswa } from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kuis · LMS Sekolah",
};

export default function SiswaKuisPage({
  params,
}: {
  params: Promise<{ id: string; kuisId: string }>;
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
  params: Promise<{ id: string; kuisId: string }>;
}) {
  const user = await requireRole("siswa");

  const { id, kuisId } = await params;
  const ruangId = Number(id);
  const kid = Number(kuisId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(kid) || kid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  if (!akses) notFound();

  const kuis = await getKuisDetail(ruangId, kid);
  // A draft does not exist as far as a student is concerned, and neither does a
  // quiz from another room.
  if (!kuis || !kuis.terbit) notFound();

  const percobaan = await getPercobaanSiswa(kid, user.id);

  return (
    <HalamanKuisSiswa
      ruang={akses.ruang}
      kuis={kuis}
      percobaan={
        percobaan
          ? {
              selesai: percobaan.selesai,
              nilai: percobaan.nilai,
              dikumpulkan: percobaan.dikumpulkan,
            }
          : null
      }
      base={`/siswa/ruang/${ruangId}`}
    />
  );
}
