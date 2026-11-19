"use server";

import { revalidatePath } from "next/cache";

import { buatKuisGoogleForm, simpanFormUrl } from "@/lib/google-form";
import { requireRole } from "@/lib/session";

export type HasilForm = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function buatKuisGoogleFormAction(input: {
  topikId: number;
  ruangId: number;
  judul: string;
}): Promise<HasilForm & { kuisId: number | null; script: string | null }> {
  const user = await requireRole("guru");
  const topikId = id(input.topikId);
  const ruangId = id(input.ruangId);
  if (!topikId || !ruangId) {
    return { error: "Pilih ruang kelas dulu.", kuisId: null, script: null };
  }

  const hasil = await buatKuisGoogleForm(user.id, topikId, ruangId, String(input.judul ?? ""));
  if (!hasil.ok) return { error: hasil.error, kuisId: null, script: null };

  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/guru/bank-soal`);
  revalidatePath(`/guru/bank-soal/topik/${topikId}`);
  return { error: null, kuisId: hasil.data.kuisId, script: hasil.data.script };
}

export async function simpanFormUrlAction(input: {
  kuisId: number;
  url: string;
}): Promise<HasilForm> {
  const user = await requireRole("guru");
  const kuisId = id(input.kuisId);
  if (!kuisId) return { error: "Kuis tidak ditemukan." };

  const hasil = await simpanFormUrl(user.id, kuisId, String(input.url ?? ""));
  if (!hasil.ok) return { error: hasil.error ?? "Gagal menyimpan URL." };
  return { error: null };
}
