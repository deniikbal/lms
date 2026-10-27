"use server";

import { revalidatePath } from "next/cache";

import { updatePengaturanBatch, getPengaturanSekolah } from "@/lib/pengaturan";
import { requireRole } from "@/lib/session";

export type PengaturanFormState = {
  error: string | null;
  ok?: boolean;
};

const LIST_PATH = "/admin/pengaturan";

export async function savePengaturanAction(
  _prevState: PengaturanFormState,
  formData: FormData,
): Promise<PengaturanFormState> {
  await requireRole("admin");

  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const nama_sekolah = text("nama_sekolah");
  const alamat = text("alamat");
  const jenjang = text("jenjang");
  const kepala_sekolah = text("kepala_sekolah");
  const kkm = text("kkm");
  const npsn = text("npsn");

  if (!nama_sekolah) return { error: "Nama sekolah wajib diisi." };
  if (!alamat) return { error: "Alamat wajib diisi." };
  if (!jenjang) return { error: "Jenjang wajib dipilih." };
  if (!kepala_sekolah) return { error: "Kepala sekolah wajib diisi." };
  if (!kkm) return { error: "KKM wajib diisi." };
  if (!npsn) return { error: "NPSN wajib diisi." };

  const jenjangValid = ["SD", "SMP", "SMA", "SMK"];
  if (!jenjangValid.includes(jenjang)) {
    return { error: "Jenjang yang dipilih tidak valid." };
  }

  const kkmNum = Number(kkm);
  if (!Number.isInteger(kkmNum) || kkmNum < 0 || kkmNum > 100) {
    return { error: "KKM harus berupa angka antara 0 dan 100." };
  }

  try {
    await updatePengaturanBatch({
      nama_sekolah,
      alamat,
      jenjang,
      kepala_sekolah,
      kkm: String(kkmNum),
      npsn,
    });
  } catch {
    return { error: "Gagal menyimpan data ke database." };
  }

  revalidatePath(LIST_PATH);
  return { error: null, ok: true };
}

/** Server-side fetch used by the route page (Server Component). */
export async function fetchPengaturanAction(): Promise<PengaturanSekolahRow | null> {
  await requireRole("admin");
  return await getPengaturanSekolah();
}

export type PengaturanSekolahRow = {
  nama_sekolah: string;
  alamat: string;
  jenjang: string;
  kepala_sekolah: string;
  kkm: number;
  npsn: string;
};