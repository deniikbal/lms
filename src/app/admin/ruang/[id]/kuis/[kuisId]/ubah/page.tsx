import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarKuis } from "@/components/ruang-belajar/lembar-kuis";
import { opsiMapelRuang } from "@/lib/bank-soal";
import { aksesRuang, getKuisDetail, listPercobaan, listSoal } from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ubah kuis · LMS Sekolah",
};

export default function GuruUbahKuisPage({
  params,
}: {
  params: Promise<{ id: string; kuisId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="form" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({
  params,
}: {
  params: Promise<{ id: string; kuisId: string }>;
}) {
  const user = await requireRole("admin");

  const { id, kuisId } = await params;
  const ruangId = Number(id);
  const kid = Number(kuisId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(kid) || kid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  if (!akses) notFound();

  const kuis = await getKuisDetail(ruangId, kid);
  if (!kuis) notFound();

  const [soal, percobaan, bankMapel] = await Promise.all([
    listSoal(kid),
    listPercobaan(kid, akses.ruang.kelasId),
    // An admin holds no bank of their own, so the picker offers the room
    // teacher's questions — those are the ones this class is being taught.
    opsiMapelRuang(akses.ruang.guruId ?? user.id, ruangId),
  ]);

  return (
    <LembarKuis
      ruang={akses.ruang}
      kuis={kuis}
      soal={soal}
      adaPercobaan={percobaan.some((row) => row.ada)}
      base={`/admin/ruang/${ruangId}`}
      mapel={bankMapel.mapel}
      mapelId={bankMapel.mapelId}
    />
  );
}
