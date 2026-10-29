import { Suspense } from "react";
import type { Metadata } from "next";

import { LoadingPanel } from "@/components/loading-panel";
import {
  DaftarRuang,
  KepalaDaftar,
} from "@/components/ruang-belajar/daftar-ruang";
import { listRuangKelas } from "@/lib/ruang-belajar";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ruang Belajar · LMS Sekolah",
};

export default function SiswaRuangPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="daftar" />}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const user = await requireRole("siswa");
  const ruang = user.kelasId ? await listRuangKelas(user.kelasId) : [];

  return (
    <div className="space-y-5">
      <KepalaDaftar
        judul="Ruang Belajar"
        ruang={ruang}
        keterangan={
          user.kelasId
            ? `${ruang.length} ruang untuk kelas Anda. Pilih satu untuk melihat materi, tugas, dan nilai.`
            : "Akun Anda belum terdaftar di kelas mana pun, jadi belum ada ruang belajar."
        }
      />
      <DaftarRuang
        ruang={ruang}
        base="/siswa/ruang"
        kosong="Belum ada ruang belajar untuk kelas Anda."
      />
    </div>
  );
}
