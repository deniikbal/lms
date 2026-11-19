"use server";

import { revalidatePath } from "next/cache";

import { buatKuisGoogleForm, sinkronJawabanForm } from "@/lib/google-form";
import { aksesRuang, bolehUbah } from "@/lib/ruang-belajar";
import { requireRole, requireUser } from "@/lib/session";

export type HasilForm = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function buatKuisGoogleFormAction(input: {
  topikId: number;
  ruangId: number;
  judul: string;
}): Promise<HasilForm & { kuisId: number | null; ruangId: number | null; formUrl: string | null }> {
  const user = await requireRole("guru");
  const topikId = id(input.topikId);
  const ruangId = id(input.ruangId);
  if (!topikId || !ruangId) {
    return { error: "Pilih ruang kelas dulu.", kuisId: null, ruangId: null, formUrl: null };
  }

  try {
    const hasil = await buatKuisGoogleForm(user.id, topikId, ruangId, String(input.judul ?? ""));
    if (!hasil.ok) {
      return { error: hasil.error, kuisId: null, ruangId: null, formUrl: null };
    }

    revalidatePath(`/guru/ruang/${ruangId}`);
    revalidatePath(`/guru/bank-soal`);
    revalidatePath(`/guru/bank-soal/topik/${topikId}`);
    return { error: null, kuisId: hasil.kuisId, ruangId, formUrl: hasil.formUrl };
  } catch {
    return {
      error: "Google menolak permintaan. Cek koneksi akun Google lalu coba lagi.",
      kuisId: null,
      ruangId: null,
      formUrl: null,
    };
  }
}

/** Manual pull of form responses, for the teacher who does not want to wait. */
export async function sinkronGoogleFormAction(input: {
  ruangId: number;
  kuisId: number;
}): Promise<HasilForm & { baru: number; tanpaNis: number }> {
  const user = await requireUser();
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", baru: 0, tanpaNis: 0 };

  const akses = await aksesRuang(ruangId, user);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", baru: 0, tanpaNis: 0 };
  if (!bolehUbah(akses.peran)) {
    return { error: "Hanya guru pengampu yang bisa menyinkronkan.", baru: 0, tanpaNis: 0 };
  }

  try {
    const hasil = await sinkronJawabanForm(kuisId);
    if (!hasil.ok) return { error: hasil.error, baru: 0, tanpaNis: 0 };

    revalidatePath(`/guru/ruang/${ruangId}/kuis/${kuisId}`);
    revalidatePath(`/siswa/ruang/${ruangId}/kuis/${kuisId}`);
    return { error: null, baru: hasil.baru, tanpaNis: hasil.tanpaNis };
  } catch {
    return { error: "Google menolak permintaan sinkron. Coba lagi sebentar.", baru: 0, tanpaNis: 0 };
  }
}
