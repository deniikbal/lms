import { Suspense } from "react";
import type { Metadata } from "next";

import {
  DaftarTopik,
  KepalaBank,
} from "@/components/bank-soal/daftar-topik";
import { LoadingPanel } from "@/components/loading-panel";
import { bacaFilter } from "@/lib/bank-soal-shared";
import { listMapelBank, listTopik, ringkasBank } from "@/lib/bank-soal";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Bank Soal · LMS Sekolah",
};

export default function BankSoalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<LoadingPanel varian="daftar" />}>
      <Isi searchParams={searchParams} />
    </Suspense>
  );
}

async function Isi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("guru");

  const mentah = await searchParams;
  const satu = (kunci: string) => {
    const nilai = mentah[kunci];
    return typeof nilai === "string" ? nilai : undefined;
  };
  const filter = bacaFilter({ mapel: satu("mapel"), jenis: satu("jenis"), cari: satu("cari") });

  const [topik, mapel, ringkasan] = await Promise.all([
    listTopik(user.id, filter),
    listMapelBank(user.id),
    ringkasBank(user.id),
  ]);

  return (
    <div className="space-y-5">
      <KepalaBank
        total={ringkasan.total}
        pg={ringkasan.pg}
        esai={ringkasan.esai}
        dipakai={ringkasan.dipakai}
        topik={ringkasan.topik}
        kosong={ringkasan.kosong}
        tautanBaru={
          filter.mapelId
            ? `/guru/bank-soal/baru?mapel=${filter.mapelId}`
            : "/guru/bank-soal/baru"
        }
      />
      <DaftarTopik topik={topik} filter={filter} mapel={mapel} />
    </div>
  );
}