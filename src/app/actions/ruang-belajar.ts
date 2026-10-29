"use server";

import { revalidatePath } from "next/cache";

import {
  aksesRuang,
  kirimDiskusi,
  bolehUbah,
  simpanMeet,
  simpanMateri,
  simpanNilaiTugas,
  simpanPengaturan,
  simpanPengumpulan,
  simpanPresensi,
  tambahKuis,
  tambahPertemuan,
  tambahTugas,
  type StatusPresensi,
} from "@/lib/ruang-belajar";
import { requireUser } from "@/lib/session";

export type HasilAksi = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function teks(value: unknown, max: number): string | null {
  const isi = String(value ?? "").trim();
  if (!isi || isi.length > max) return null;
  return isi;
}

/** `2026-11-04T23:59` (datetime-local) → `2026-11-04 23:59`, or null. */
function tanggalJam(value: unknown): string | null {
  const isi = String(value ?? "").trim();
  if (!isi) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isi) ? isi.replace("T", " ") : null;
}

/** `07:30` or empty. */
function jam(value: unknown): string | null {
  const isi = String(value ?? "").trim();
  if (!isi) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(isi) ? isi : null;
}

function urlAtauNull(value: unknown): { ok: boolean; url: string | null } {
  const isi = String(value ?? "").trim();
  if (!isi) return { ok: true, url: null };
  try {
    const url = new URL(isi);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, url: null };
    }
    return { ok: true, url: isi };
  } catch {
    return { ok: false, url: null };
  }
}

/** Confirms the visitor may change this room, and returns nothing if not. */
async function siapkan(ruangId: number) {
  const user = await requireUser();
  const akses = await aksesRuang(ruangId, user);
  if (!akses) return { user, akses: null, boleh: false };
  return { user, akses, boleh: bolehUbah(akses.peran) };
}

function segarkan(ruangId: number, pertemuanId?: number) {
  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/admin/ruang/${ruangId}`);
  revalidatePath(`/siswa/ruang/${ruangId}`);
  revalidatePath("/guru/ruang");
  if (pertemuanId) {
    revalidatePath(`/guru/ruang/${ruangId}/pertemuan/${pertemuanId}`);
    revalidatePath(`/admin/ruang/${ruangId}/pertemuan/${pertemuanId}`);
    // The student page renders the material, so it has to be refreshed too —
    // otherwise the teacher's edit is invisible to the class until a reload.
    revalidatePath(`/siswa/ruang/${ruangId}/pertemuan/${pertemuanId}`);
  }
}

function segarkanTugas(ruangId: number, tugasId: number) {
  revalidatePath(`/guru/ruang/${ruangId}`);
  revalidatePath(`/admin/ruang/${ruangId}`);
  revalidatePath(`/siswa/ruang/${ruangId}`);
  revalidatePath(`/guru/ruang/${ruangId}/tugas/${tugasId}`);
  revalidatePath(`/admin/ruang/${ruangId}/tugas/${tugasId}`);
  revalidatePath(`/siswa/ruang/${ruangId}/tugas/${tugasId}`);
}

export async function tambahPertemuanAction(input: {
  ruangId: number;
  judul: string;
  tanggal: string;
  terbit: boolean;
  materi?: string | null;
  videoUrl?: string | null;
  presensiBuka?: string | null;
  presensiTutup?: string | null;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah pertemuan." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul pertemuan wajib diisi (maks. 120 karakter)." };

  const tanggal = String(input.tanggal ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return { error: "Tanggal pertemuan wajib diisi." };
  }

  const buka = input.presensiBuka ? jam(input.presensiBuka) : null;
  const tutup = input.presensiTutup ? jam(input.presensiTutup) : null;
  if (input.presensiBuka && !buka) return { error: "Jam buka presensi tidak valid." };
  if (input.presensiTutup && !tutup) return { error: "Jam tutup presensi tidak valid." };
  if (buka && tutup && tutup <= buka) {
    return { error: "Jam tutup presensi harus setelah jam buka." };
  }
  if ((buka && !tutup) || (!buka && tutup)) {
    return { error: "Isi jam buka dan tutup presensi sekaligus, atau kosongkan keduanya." };
  }

  const video = urlAtauNull(input.videoUrl);
  if (!video.ok) return { error: "Link video harus berupa URL lengkap." };

  const hasil = await tambahPertemuan({
    ruangId,
    judul,
    tanggal,
    terbit: Boolean(input.terbit),
    materi: materiAtauNull(input.materi),
    videoUrl: video.url,
    presensiBuka: buka,
    presensiTutup: tutup,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

/** Long-form text: trimmed, blank → null, over the cap → null (rejected upstream). */
function materiAtauNull(value: unknown): string | null {
  const isi = String(value ?? "").replace(/\r\n/g, "\n").trim();
  return isi ? isi : null;
}

const MAKS_MATERI = 8000;

/**
 * Saves the written material of one meeting.
 *
 * The room is re-checked here rather than trusted from the page: this is the
 * write path, and a teacher of room A must not be able to edit room B's
 * material by changing an id in the request.
 */
export async function simpanMateriAction(input: {
  ruangId: number;
  pertemuanId: number;
  materi: string;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menulis materi." };

  const isi = String(input.materi ?? "");
  if (isi.length > MAKS_MATERI) {
    return { error: `Materi terlalu panjang (maks. ${MAKS_MATERI} karakter).` };
  }

  const hasil = await simpanMateri({
    ruangId,
    pertemuanId,
    materi: materiAtauNull(isi),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId, pertemuanId);
  return { error: null };
}

export async function tambahTugasAction(input: {
  ruangId: number;
  judul: string;
  tenggat?: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah tugas." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul tugas wajib diisi (maks. 120 karakter)." };

  const tipe = input.tipe;
  if (!["file", "teks", "keduanya"].includes(tipe)) {
    return { error: "Jenis pengumpulan tidak dikenal." };
  }

  const tenggat = input.tenggat ? tanggalJam(input.tenggat) : null;
  if (input.tenggat && !tenggat) return { error: "Tenggat tidak valid." };

  const hasil = await tambahTugas({
    ruangId,
    judul,
    tenggat,
    tipe,
    bolehTerlambat: Boolean(input.bolehTerlambat),
    terbit: Boolean(input.terbit),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

export async function tambahKuisAction(input: {
  ruangId: number;
  judul: string;
  mulai?: string | null;
  selesai?: string | null;
  durasiMenit: number;
  terbit: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah kuis." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul kuis wajib diisi (maks. 120 karakter)." };

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

  const hasil = await tambahKuis({
    ruangId,
    judul,
    mulai,
    selesai,
    durasiMenit: durasi,
    terbit: Boolean(input.terbit),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

export async function simpanPengaturanAction(input: {
  ruangId: number;
  deskripsi: string;
  kkm: number;
  bobotTugas: number;
  bobotKuis: number;
  bobotKehadiran: number;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengubah pengaturan." };

  const kkm = Number(input.kkm);
  if (!Number.isInteger(kkm) || kkm < 0 || kkm > 100) {
    return { error: "KKM harus bilangan bulat 0–100." };
  }

  const bobot = [input.bobotTugas, input.bobotKuis, input.bobotKehadiran].map(Number);
  if (bobot.some((n) => !Number.isInteger(n) || n < 0 || n > 100)) {
    return { error: "Setiap bobot harus bilangan bulat 0–100." };
  }

  const deskripsi = String(input.deskripsi ?? "").trim();

  const hasil = await simpanPengaturan({
    ruangId,
    deskripsi: deskripsi || null,
    kkm,
    bobotTugas: bobot[0],
    bobotKuis: bobot[1],
    bobotKehadiran: bobot[2],
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

export async function simpanMeetAction(input: {
  ruangId: number;
  jadwalId: number;
  linkMeet: string | null;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const jadwalId = id(input.jadwalId);
  if (!ruangId || !jadwalId) return { error: "Jadwal tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengubah link Meet." };

  const link = urlAtauNull(input.linkMeet);
  if (!link.ok) return { error: "Link Meet harus berupa URL lengkap." };

  const hasil = await simpanMeet({ ruangId, jadwalId, linkMeet: link.url });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

export async function kirimDiskusiAction(input: {
  ruangId: number;
  isi: string;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const user = await requireUser();
  const akses = await aksesRuang(ruangId, user);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };

  const isi = teks(input.isi, 2000);
  if (!isi) return { error: "Tulis pertanyaan atau tanggapan dulu." };

  await kirimDiskusi({ ruangId, userId: user.id, isi });
  segarkan(ruangId);
  return { error: null };
}

const STATUS_SAH = new Set<StatusPresensi>(["hadir", "izin", "sakit", "alpa"]);

/**
 * The teacher's manual attendance sheet.
 *
 * `status: null` clears the row. Authorisation is re-checked here rather than
 * trusted from the page, so a student cannot POST a sheet of their own.
 */
export async function simpanPresensiAction(input: {
  ruangId: number;
  pertemuanId: number;
  entri: { siswaId: string; status: string | null }[];
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengisi presensi." };

  const daftar = Array.isArray(input.entri) ? input.entri : [];
  if (daftar.length > 500) return { error: "Terlalu banyak baris presensi sekaligus." };

  const entri: { siswaId: string; status: StatusPresensi | null }[] = [];
  for (const baris of daftar) {
    const siswaId = String(baris?.siswaId ?? "").trim();
    if (!siswaId) return { error: "Ada baris presensi tanpa siswa." };

    const status = baris?.status === null || baris?.status === undefined
      ? null
      : String(baris.status);
    if (status !== null && !STATUS_SAH.has(status as StatusPresensi)) {
      return { error: "Status presensi tidak dikenal." };
    }

    entri.push({ siswaId, status: status as StatusPresensi | null });
  }

  const hasil = await simpanPresensi({
    ruangId,
    pertemuanId,
    kelasId: akses.ruang.kelasId,
    entri,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId, pertemuanId);
  return { error: null };
}

/**
 * A student sending (or re-sending) their answer.
 *
 * The deadline and "already graded" rules are enforced in `simpanPengumpulan`,
 * so the same check covers a replayed POST.
 */
export async function kirimTugasAction(input: {
  ruangId: number;
  tugasId: number;
  teks: string;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { user, akses } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (akses.peran !== "siswa") {
    return { error: "Hanya siswa kelas ini yang bisa mengumpulkan tugas." };
  }

  const isi = String(input.teks ?? "").trim();
  if (!isi) return { error: "Tulis jawaban dulu sebelum mengumpulkan." };
  if (isi.length > 5000) {
    return { error: "Jawaban terlalu panjang (maks. 5000 karakter)." };
  }

  const hasil = await simpanPengumpulan({
    ruangId,
    tugasId,
    siswaId: user.id,
    kelasId: akses.ruang.kelasId,
    teks: isi,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkanTugas(ruangId, tugasId);
  return { error: null };
}

/** Grades from the teacher's submission sheet. `nilai: null` clears a grade. */
export async function simpanNilaiTugasAction(input: {
  ruangId: number;
  tugasId: number;
  entri: { siswaId: string; nilai: number | null }[];
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menilai tugas." };

  const daftar = Array.isArray(input.entri) ? input.entri : [];
  if (daftar.length > 500) return { error: "Terlalu banyak baris sekaligus." };

  const entri: { siswaId: string; nilai: number | null }[] = [];
  for (const baris of daftar) {
    const siswaId = String(baris?.siswaId ?? "").trim();
    if (!siswaId) return { error: "Ada baris nilai tanpa siswa." };

    const mentah = baris?.nilai;
    let nilai: number | null = null;
    if (mentah !== null && mentah !== undefined && String(mentah).trim() !== "") {
      nilai = Number(mentah);
      if (!Number.isInteger(nilai) || nilai < 0 || nilai > 100) {
        return { error: "Nilai harus bilangan bulat 0–100." };
      }
    }

    entri.push({ siswaId, nilai });
  }

  const hasil = await simpanNilaiTugas({
    ruangId,
    tugasId,
    kelasId: akses.ruang.kelasId,
    entri,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkanTugas(ruangId, tugasId);
  return { error: null };
}
