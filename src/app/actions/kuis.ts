"use server";

import { revalidatePath } from "next/cache";

import {
  aksesRuang,
  bolehUbah,
  hapusKuis,
  hapusSoal,
  imporSoal,
  koreksiEsai,
  kumpulkanPercobaan,
  mulaiPercobaan,
  resetPercobaan,
  simpanJawaban,
  simpanKuis,
  sinkronKuisDariBank,
  tambahSoal,
  tambahSoalDariBank,
  ubahSoal,
} from "@/lib/ruang-belajar";
import { HURUF, parseSoalTeks, type JenisSoal } from "@/lib/ruang-belajar-shared";
import {
  idsTopik,
  listSoalTopik,
  listTopik,
  type BankSoalRow,
  type TopikRingkas,
} from "@/lib/bank-soal";
import { requireUser } from "@/lib/session";

export type HasilKuis = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** `2026-11-04T23:59` (datetime-local) → `2026-11-04 23:59`, or null. */
function tanggalJam(value: unknown): string | null {
  const isi = String(value ?? "").trim();
  if (!isi) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isi) ? isi.replace("T", " ") : null;
}

async function siapkan(ruangId: number) {
  const user = await requireUser();
  const akses = await aksesRuang(ruangId, user);
  if (!akses) return { user, akses: null, boleh: false };
  return { user, akses, boleh: bolehUbah(akses.peran) };
}

/** Every screen that can show this quiz, including the student's own. */
function segarkanKuis(ruangId: number, kuisId: number) {
  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/admin/ruang/${ruangId}`);
  revalidatePath(`/siswa/ruang/${ruangId}`);
  revalidatePath(`/guru/ruang/${ruangId}/kuis/${kuisId}`);
  revalidatePath(`/admin/ruang/${ruangId}/kuis/${kuisId}`);
  revalidatePath(`/guru/ruang/${ruangId}/kuis/${kuisId}/ubah`);
  revalidatePath(`/admin/ruang/${ruangId}/kuis/${kuisId}/ubah`);
  revalidatePath(`/siswa/ruang/${ruangId}/kuis/${kuisId}`);
  revalidatePath(`/siswa/ruang/${ruangId}/kuis/${kuisId}/kerjakan`);
  // The "dipakai di N kuis" figures on the bank pages move with every copy.
  revalidatePath("/guru/bank-soal");
  revalidatePath("/guru/bank-soal/[id]", "page");
}

/** Reads the answer map coming from the quiz screen. */
function bacaJawaban(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return {};
  const entri = Object.entries(value as Record<string, unknown>);
  if (entri.length > 500) return null;

  const hasil: Record<string, string> = {};
  for (const [kunci, isi] of entri) {
    if (!/^\d+$/.test(kunci)) return null;
    const teks = String(isi ?? "");
    if (teks.length > 5000) return null;
    hasil[kunci] = teks;
  }
  return hasil;
}

// ------------------------------------------------------------- pengaturan

export async function simpanKuisAction(input: {
  ruangId: number;
  kuisId: number;
  judul: string;
  petunjuk: string;
  mulai: string | null;
  selesai: string | null;
  durasiMenit: number;
  acakSoal: boolean;
  acakOpsi: boolean;
  tampilkanNilai: boolean;
  terbit: boolean;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengubah kuis." };

  const judul = String(input.judul ?? "").trim();
  if (!judul || judul.length > 120) {
    return { error: "Judul kuis wajib diisi (maks. 120 karakter)." };
  }

  const petunjuk = String(input.petunjuk ?? "").trim();
  if (petunjuk.length > 2000) {
    return { error: "Petunjuk terlalu panjang (maks. 2000 karakter)." };
  }

  const durasi = Number(input.durasiMenit);
  if (!Number.isInteger(durasi) || durasi < 5 || durasi > 600) {
    return { error: "Durasi harus antara 5 dan 600 menit." };
  }

  const mulai = input.mulai ? tanggalJam(input.mulai) : null;
  const selesai = input.selesai ? tanggalJam(input.selesai) : null;
  if (input.mulai && !mulai) return { error: "Waktu mulai tidak valid." };
  if (input.selesai && !selesai) return { error: "Waktu selesai tidak valid." };
  if (mulai && selesai && selesai <= mulai) {
    return { error: "Waktu selesai harus setelah waktu mulai." };
  }

  const hasil = await simpanKuis({
    ruangId,
    kuisId,
    judul,
    petunjuk: petunjuk || null,
    mulai,
    selesai,
    durasiMenit: durasi,
    acakSoal: Boolean(input.acakSoal),
    acakOpsi: Boolean(input.acakOpsi),
    tampilkanNilai: Boolean(input.tampilkanNilai),
    terbit: Boolean(input.terbit),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkanKuis(ruangId, kuisId);
  return { error: null };
}

// -------------------------------------------------------------------- soal

export async function simpanSoalAction(input: {
  ruangId: number;
  kuisId: number;
  soalId: number | null;
  jenis: JenisSoal;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  bobot: number;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menyusun soal." };

  const jenis: JenisSoal = input.jenis === "esai" ? "esai" : "pg";

  const pertanyaan = String(input.pertanyaan ?? "").trim();
  if (!pertanyaan) return { error: "Pertanyaan wajib diisi." };
  if (pertanyaan.length > 2000) {
    return { error: "Pertanyaan terlalu panjang (maks. 2000 karakter)." };
  }

  const bobot = Number(input.bobot);
  if (!Number.isInteger(bobot) || bobot < 1 || bobot > 100) {
    return { error: "Bobot harus bilangan bulat 1–100." };
  }

  let pilihan: Record<string, string> = {};
  let jawaban: string | null = null;

  if (jenis === "pg") {
    for (const huruf of HURUF) {
      const isi = String(input.pilihan?.[huruf] ?? "").trim();
      if (isi) pilihan[huruf] = isi;
    }
    const terisi = Object.keys(pilihan);
    if (terisi.length < 2) {
      return { error: "Soal pilihan ganda butuh minimal dua opsi." };
    }
    jawaban = String(input.jawaban ?? "").trim().toUpperCase();
    if (!jawaban || !pilihan[jawaban]) {
      return { error: "Tandai satu opsi sebagai kunci jawaban." };
    }
  }

  const soal = { jenis, pertanyaan, pilihan, jawaban, bobot };

  const hasil = input.soalId
    ? await ubahSoal(kuisId, id(input.soalId) ?? 0, soal)
    : await tambahSoal(kuisId, soal);
  if (!hasil.ok) return { error: hasil.error };

  segarkanKuis(ruangId, kuisId);
  return { error: null };
}

export async function hapusSoalAction(input: {
  ruangId: number;
  kuisId: number;
  soalId: number;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  const soalId = id(input.soalId);
  if (!ruangId || !kuisId || !soalId) return { error: "Soal tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menghapus soal." };

  const hasil = await hapusSoal(kuisId, soalId);
  if (!hasil.ok) return { error: hasil.error };

  segarkanKuis(ruangId, kuisId);
  return { error: null };
}

/**
 * Bulk import. The text is parsed on the server so the stored questions cannot
 * differ from what the preview showed.
 */
export async function imporSoalAction(input: {
  ruangId: number;
  kuisId: number;
  teks: string;
}): Promise<HasilKuis & { jumlah: number; galat: string[] }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) {
    return { error: "Kuis tidak ditemukan.", jumlah: 0, galat: [] };
  }

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", jumlah: 0, galat: [] };
  if (!boleh) {
    return { error: "Hanya guru pengampu yang bisa mengimpor soal.", jumlah: 0, galat: [] };
  }

  const teks = String(input.teks ?? "").trim();
  if (!teks) return { error: "Tempel teks soal dulu.", jumlah: 0, galat: [] };

  const { soal, galat } = parseSoalTeks(teks);
  const hasil = await imporSoal(kuisId, soal);
  if (!hasil.ok) return { error: hasil.error, jumlah: 0, galat };

  segarkanKuis(ruangId, kuisId);
  return { error: null, jumlah: hasil.jumlah, galat };
}

// --------------------------------------------------------------- dari bank

/**
 * Assigns bank questions into this quiz.
 *
 * Ownership is checked twice: once through the room (you may only change a quiz
 * you teach) and once through the bank (you may only assign *your* questions).
 * Both matter — a teacher could be an admin of a room they hold no bank for.
 */
export async function tambahSoalDariBankAction(input: {
  ruangId: number;
  kuisId: number;
  bankIds: number[];
}): Promise<HasilKuis & { jumlah: number }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", jumlah: 0 };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menyusun soal.", jumlah: 0 };

  const bankIds = Array.isArray(input.bankIds)
    ? input.bankIds.map(id).filter((nilai): nilai is number => nilai !== null)
    : [];
  if (bankIds.length > 200) {
    return { error: "Terlalu banyak soal sekaligus (maks. 200).", jumlah: 0 };
  }

  // The bank belongs to the room's teacher. An admin editing a colleague's quiz
  // gets that colleague's questions, the same set the picker showed them.
  const pemilik = akses?.ruang.guruId ?? user.id;
  const hasil = await tambahSoalDariBank(kuisId, pemilik, bankIds);
  if (!hasil.ok) return { error: hasil.error, jumlah: 0 };

  segarkanKuis(ruangId, kuisId);
  return { error: null, jumlah: hasil.jumlah };
}

/**
 * Assigns an entire topic into this quiz — the normal way round.
 *
 * The ids are resolved on the server from the topic id so the set is not a
 * stale copy of what the dialog listed: questions added to the topic while the
 * dialog was open still come along.
 */
export async function tambahTopikDariBankAction(input: {
  ruangId: number;
  kuisId: number;
  topikId: number;
}): Promise<HasilKuis & { jumlah: number }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", jumlah: 0 };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menyusun soal.", jumlah: 0 };

  const topikId = id(input.topikId);
  if (!topikId) return { error: "Topik tidak ditemukan.", jumlah: 0 };

  const pemilik = akses?.ruang.guruId ?? user.id;
  const bankIds = await idsTopik(pemilik, topikId);
  if (bankIds.length === 0) {
    return { error: "Topik itu belum punya soal di bank.", jumlah: 0 };
  }

  const hasil = await tambahSoalDariBank(kuisId, pemilik, bankIds);
  if (!hasil.ok) return { error: hasil.error, jumlah: 0 };

  segarkanKuis(ruangId, kuisId);
  return { error: null, jumlah: hasil.jumlah };
}

/**
 * Pulls the bank's current wording into the copies inside this quiz.
 *
 * Separate from `tambahSoalDariBankAction` because it is the one path that can
 * change the score of a student who already sat the quiz — the figures are
 * re-derived from the questions as they now stand.
 */
export async function sinkronKuisDariBankAction(input: {
  ruangId: number;
  kuisId: number;
}): Promise<HasilKuis & { jumlah: number }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", jumlah: 0 };

  const { user, boleh } = await siapkan(ruangId);
  if (!boleh) {
    return { error: "Hanya guru pengampu yang bisa menyinkronkan soal.", jumlah: 0 };
  }

  const hasil = await sinkronKuisDariBank(kuisId, user.id);
  if (!hasil.ok) return { error: hasil.error, jumlah: 0 };

  segarkanKuis(ruangId, kuisId);
  return { error: null, jumlah: hasil.jumlah };
}

/**
 * The topics the picker offers for one quiz, with their question counts.
 *
 * Scoped to the *room's* teacher rather than the caller: an admin editing a
 * colleague's quiz should see that colleague's bank, because those are the
 * questions the class is actually being taught.
 */
export async function cariTopikUntukKuisAction(input: {
  ruangId: number;
  mapelId: number | null;
  cari: string;
}): Promise<{ error: string | null; topik: TopikRingkas[] }> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang tidak ditemukan.", topik: [] };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", topik: [] };
  if (!boleh) {
    return { error: "Hanya guru pengampu yang bisa menyusun soal.", topik: [] };
  }

  const pemilik = akses.ruang.guruId ?? user.id;
  const topik = await listTopik(pemilik, {
    mapelId: id(input.mapelId),
    jenis: null,
    cari: String(input.cari ?? "").trim().slice(0, 100),
  });

  return { error: null, topik };
}

/** The questions inside one topic, for the picker's "pilih sebagian". */
export async function soalTopikUntukKuisAction(input: {
  ruangId: number;
  topikId: number;
  jenis: string | null;
  cari: string;
}): Promise<{ error: string | null; soal: BankSoalRow[] }> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang tidak ditemukan.", soal: [] };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", soal: [] };
  if (!boleh) {
    return { error: "Hanya guru pengampu yang bisa menyusun soal.", soal: [] };
  }

  const topikId = id(input.topikId);
  if (!topikId) return { error: "Topik tidak ditemukan.", soal: [] };

  const pemilik = akses.ruang.guruId ?? user.id;
  const cari = String(input.cari ?? "").trim().slice(0, 100);
  const jenis = input.jenis === "pg" || input.jenis === "esai" ? input.jenis : null;

  const soal = await listSoalTopik(pemilik, topikId, jenis, cari);
  return { error: null, soal };
}

export async function hapusKuisAction(input: {
  ruangId: number;
  kuisId: number;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menghapus kuis." };

  const hasil = await hapusKuis(ruangId, kuisId);
  if (!hasil.ok) return { error: hasil.error };

  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/admin/ruang/${ruangId}`);
  revalidatePath(`/siswa/ruang/${ruangId}`);
  return { error: null };
}

// --------------------------------------------------------------- percobaan

export async function mulaiKuisAction(input: {
  ruangId: number;
  kuisId: number;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan." };

  const { user, akses } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (akses.peran !== "siswa") {
    return { error: "Hanya siswa kelas ini yang bisa mengerjakan kuis." };
  }

  const hasil = await mulaiPercobaan({
    ruangId,
    kuisId,
    siswaId: user.id,
    kelasId: akses.ruang.kelasId,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkanKuis(ruangId, kuisId);
  return { error: null };
}

/**
 * Autosave. `ditutup` tells the screen to submit immediately instead of showing
 * an error the student cannot act on.
 */
export async function simpanJawabanAction(input: {
  ruangId: number;
  kuisId: number;
  jawaban: Record<string, string>;
}): Promise<{ error: string | null; ditutup: boolean }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", ditutup: false };

  const { user, akses } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", ditutup: false };
  if (akses.peran !== "siswa") {
    return { error: "Hanya siswa yang mengerjakan kuis ini.", ditutup: false };
  }

  const jawaban = bacaJawaban(input.jawaban);
  if (!jawaban) return { error: "Jawaban tidak valid.", ditutup: false };

  const hasil = await simpanJawaban({ kuisId, siswaId: user.id, jawaban });
  if (!hasil.ok) return { error: hasil.error, ditutup: hasil.ditutup };
  return { error: null, ditutup: false };
}

export async function kumpulkanKuisAction(input: {
  ruangId: number;
  kuisId: number;
  jawaban: Record<string, string>;
}): Promise<HasilKuis & { nilai: number | null }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", nilai: null };

  const { user, akses } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", nilai: null };
  if (akses.peran !== "siswa") {
    return { error: "Hanya siswa yang mengerjakan kuis ini.", nilai: null };
  }

  const jawaban = bacaJawaban(input.jawaban);
  if (!jawaban) return { error: "Jawaban tidak valid.", nilai: null };

  const hasil = await kumpulkanPercobaan({ kuisId, siswaId: user.id, jawaban });
  if (!hasil.ok) return { error: hasil.error, nilai: null };

  segarkanKuis(ruangId, kuisId);
  return { error: null, nilai: hasil.nilai };
}

/** The teacher's essay correction for one student. */
export async function koreksiEsaiAction(input: {
  ruangId: number;
  kuisId: number;
  siswaId: string;
  nilaiEsai: Record<string, number>;
}): Promise<HasilKuis & { nilai: number | null }> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan.", nilai: null };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini.", nilai: null };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengoreksi esai.", nilai: null };

  const siswaId = String(input.siswaId ?? "").trim();
  if (!siswaId) return { error: "Siswa tidak ditemukan.", nilai: null };

  const bersih: Record<string, number> = {};
  for (const [soalId, skor] of Object.entries(input.nilaiEsai ?? {})) {
    if (!/^\d+$/.test(soalId)) return { error: "Soal tidak dikenal.", nilai: null };
    const angka = Number(skor);
    if (!Number.isFinite(angka)) return { error: "Skor esai harus berupa angka.", nilai: null };
    bersih[soalId] = angka;
  }

  const hasil = await koreksiEsai({ kuisId, siswaId, nilaiEsai: bersih });
  if (!hasil.ok) return { error: hasil.error, nilai: null };

  segarkanKuis(ruangId, kuisId);
  return { error: null, nilai: hasil.nilai };
}

export async function resetPercobaanAction(input: {
  ruangId: number;
  kuisId: number;
  siswaId: string;
}): Promise<HasilKuis> {
  const ruangId = id(input.ruangId);
  const kuisId = id(input.kuisId);
  if (!ruangId || !kuisId) return { error: "Kuis tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengulang percobaan." };

  const siswaId = String(input.siswaId ?? "").trim();
  if (!siswaId) return { error: "Siswa tidak ditemukan." };

  const hasil = await resetPercobaan(kuisId, siswaId);
  if (!hasil.ok) return { error: hasil.error };

  segarkanKuis(ruangId, kuisId);
  return { error: null };
}
