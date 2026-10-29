"use server";

import { revalidatePath } from "next/cache";

import {
  aksesRuang,
  catatPresensiSendiri,
  tandaiSelesai,
  type StatusPresensi,
} from "@/lib/ruang-belajar";
import { requireUser } from "@/lib/session";

export type HasilAksi = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * What a student may declare about themselves.
 *
 * "Alpa" is deliberately absent: absence is a verdict the school reaches, not
 * something a student can claim about themselves in advance.
 */
const BISA_DIAJUKAN = new Set<StatusPresensi>(["hadir", "izin", "sakit"]);

/**
 * Revalidates both sides of the same row.
 *
 * A student's check-in changes the badge on their own Materi tab and the tally
 * on the teacher's card, so leaving the teacher's page cached would show the
 * class a number the teacher cannot explain.
 */
function segarkan(ruangId: number, pertemuanId: number) {
  revalidatePath("/siswa/ruang");
  revalidatePath(`/siswa/ruang/${ruangId}`);
  revalidatePath(`/siswa/ruang/${ruangId}/pertemuan/${pertemuanId}`);
  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/guru/ruang/${ruangId}/pertemuan/${pertemuanId}`);
  revalidatePath(`/admin/ruang/${ruangId}`);
  revalidatePath(`/admin/ruang/${ruangId}/pertemuan/${pertemuanId}`);
}

/** Confirms the visitor is a student of this room's class. */
async function siswaRuang(ruangId: number) {
  const user = await requireUser();
  const akses = await aksesRuang(ruangId, user);
  if (!akses) {
    return { ok: false as const, error: "Anda tidak punya akses ke ruang ini." };
  }
  if (akses.peran !== "siswa") {
    return { ok: false as const, error: "Hanya siswa kelas ini yang bisa melakukan ini." };
  }
  return { ok: true as const, user, akses };
}

/**
 * A student checking themselves in.
 *
 * The window and the "the teacher's word is final" rule live in
 * `catatPresensiSendiri`, so a replayed POST hits exactly the same wall as the
 * button does.
 */
export async function catatHadirAction(input: {
  ruangId: number;
  pertemuanId: number;
  status: string;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const siap = await siswaRuang(ruangId);
  if (!siap.ok) return { error: siap.error };

  const status = String(input.status ?? "");
  if (!BISA_DIAJUKAN.has(status as StatusPresensi)) {
    return { error: "Status presensi tidak dikenal." };
  }

  const hasil = await catatPresensiSendiri({
    ruangId,
    pertemuanId,
    siswaId: siap.user.id,
    kelasId: siap.akses.ruang.kelasId,
    status: status as StatusPresensi,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId, pertemuanId);
  return { error: null };
}

/**
 * The student's own "sudah dipelajari" mark.
 *
 * No window applies: it is a bookmark, and a student who reads the material at
 * midnight should be able to say so.
 */
export async function tandaiSelesaiAction(input: {
  ruangId: number;
  pertemuanId: number;
  selesai: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const siap = await siswaRuang(ruangId);
  if (!siap.ok) return { error: siap.error };

  const hasil = await tandaiSelesai({
    ruangId,
    pertemuanId,
    siswaId: siap.user.id,
    kelasId: siap.akses.ruang.kelasId,
    selesai: Boolean(input.selesai),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId, pertemuanId);
  return { error: null };
}
