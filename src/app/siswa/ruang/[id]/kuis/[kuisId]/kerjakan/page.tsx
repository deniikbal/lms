import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { KerjakanKuis } from "@/components/ruang-belajar/kerjakan-kuis";
import {
  aksesRuang,
  getKuisDetail,
  getPercobaanSiswa,
  listSoal,
  type UrutanSoal,
} from "@/lib/ruang-belajar";
import type { SoalRow } from "@/lib/ruang-belajar-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mengerjakan kuis · LMS Sekolah",
};

export default function KerjakanKuisPage({
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

/**
 * Puts the questions back in the order frozen when the attempt started, and the
 * options back in their frozen order too.
 *
 * A question added while the student was working is appended rather than
 * dropped; an option removed by the teacher simply disappears.
 */
function susun(soal: SoalRow[], urutan: UrutanSoal | null): SoalRow[] {
  if (!urutan) return soal;

  const peta = new Map(soal.map((item) => [item.id, item]));
  const tersusun = urutan.soal
    .map((id) => peta.get(id))
    .filter((item): item is SoalRow => Boolean(item));
  const tambahan = soal.filter((item) => !urutan.soal.includes(item.id));
  const daftar = [...tersusun, ...tambahan];

  return daftar.map((item) => {
    const opsi = urutan.opsi?.[String(item.id)];
    if (!opsi || item.jenis !== "pg") return item;

    const pilihan: Record<string, string> = {};
    for (const huruf of opsi) {
      if (item.pilihan[huruf]) pilihan[huruf] = item.pilihan[huruf];
    }
    for (const huruf of Object.keys(item.pilihan)) {
      if (!pilihan[huruf]) pilihan[huruf] = item.pilihan[huruf];
    }
    return { ...item, pilihan };
  });
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
  if (!kuis || !kuis.terbit) notFound();

  const percobaan = await getPercobaanSiswa(kid, user.id);
  const info = `/siswa/ruang/${ruangId}/kuis/${kid}`;

  // Without an attempt there is nothing to answer, and a collected one cannot be
  // reopened — both belong on the quiz's own page, not on a blank sheet.
  if (!percobaan) redirect(info);
  if (percobaan.selesai) redirect(info);

  const soal = susun(await listSoal(kid), percobaan.urutan);

  return (
    <KerjakanKuis
      ruangId={ruangId}
      kuisId={kid}
      judul={kuis.judul}
      petunjuk={kuis.petunjuk}
      soal={soal}
      jawabanAwal={percobaan.jawaban}
      sisaDetik={percobaan.sisaDetik}
      tampilkanNilai={kuis.tampilkanNilai}
      alamatKembali={info}
    />
  );
}
