import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { LembarHasilKuis } from "@/components/ruang-belajar/lembar-hasil-kuis";
import {
  aksesRuang,
  getKuisDetail,
  listJawabanPercobaan,
  listPercobaan,
  listSoal,
} from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Hasil kuis · LMS Sekolah",
};

export default function GuruKuisPage({
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
  const user = await requireRole("guru");

  const { id, kuisId } = await params;
  const ruangId = Number(id);
  const kid = Number(kuisId);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();
  if (!Number.isInteger(kid) || kid <= 0) notFound();

  const akses = await aksesRuang(ruangId, user);
  if (!akses) notFound();

  const kuis = await getKuisDetail(ruangId, kid);
  if (!kuis) notFound();

  const [soal, percobaan, jawaban] = await Promise.all([
    listSoal(kid),
    listPercobaan(kid, akses.ruang.kelasId),
    listJawabanPercobaan(kid),
  ]);

  // The correction panel needs the answers and the scores already given, both
  // keyed by student, so the table can open a row without another round trip.
  const petaJawaban: Record<string, Record<string, string>> = {};
  const petaNilaiEsai: Record<string, Record<string, number>> = {};
  for (const item of jawaban) {
    petaJawaban[item.siswaId] = item.jawaban;
    petaNilaiEsai[item.siswaId] = item.nilaiEsai;
  }

  return (
    <LembarHasilKuis
      ruang={akses.ruang}
      kuis={kuis}
      soal={soal}
      percobaan={percobaan}
      jawaban={petaJawaban}
      nilaiEsai={petaNilaiEsai}
      base={`/guru/ruang/${ruangId}`}
    />
  );
}
