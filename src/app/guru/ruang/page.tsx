import { Suspense } from "react";
import type { Metadata } from "next";

import { LoadingPanel } from "@/components/loading-panel";
import {
  DaftarRuang,
  KepalaDaftar,
} from "@/components/ruang-belajar/daftar-ruang";
import { listRuangGuru } from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ruang Belajar · LMS Sekolah",
};

export default function RuangBelajarPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="daftar" />}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const user = await requireRole("guru");
  const ruang = await listRuangGuru(user.id);

  return (
    <div className="space-y-5">
      <KepalaDaftar
        judul="Ruang Belajar"
        ruang={ruang}
        keterangan={
          ruang.length === 0
            ? "Belum ada ruang yang diampu. Minta admin menetapkan Anda sebagai guru pengampu di Pembagian Mengajar."
            : `${ruang.length} ruang yang Anda ampu. Isinya materi, tugas, kuis, presensi, dan nilai per kelas.`
        }
      />
      <DaftarRuang
        ruang={ruang}
        base="/guru/ruang"
        kosong="Belum ada ruang belajar yang diampu akun ini."
      />
    </div>
  );
}
