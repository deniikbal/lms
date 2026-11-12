"use server";

import { revalidatePath } from "next/cache";

import {
  aksesRuang,
  getPengumpulanSiswa,
  getPertemuanDetail,
  getTugasDetail,
  kosongkanBerkasPengumpulan,
  kirimDiskusi,
  bolehUbah,
  listKelompok,
  listLampiranGuru,
  listRuangSejenis,
  simpanMeet,
  simpanMateri,
  simpanNilaiTugas,
  simpanKelompok,
  simpanPengaturan,
  simpanPengumpulan,
  simpanPresensi,
  ubahTugas,
  hapusPertemuan,
  hapusPengumpulan,
  hapusTugas,
  tambahKuis,
  tambahPertemuan,
  tambahPertemuanBanyak,
  tambahTugas,
  tambahTugasBanyak,
  ubahPertemuan,
  type KelompokRow,
  type StatusPresensi,
} from "@/lib/ruang-belajar";
import {
  BATAS_BERKAS,
  MIME_DIIZINKAN,
  hapusDariDrive,
  unggahKeDrive,
} from "@/lib/drive";
import { requireUser } from "@/lib/session";
import { buatMeet, hapusMeet, tambahJam, ubahMeet, type WaktuMeet } from "@/lib/meet";

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

type IsiPertemuan = {
  judul: string;
  tanggal: string;
  terbit: boolean;
  videoUrl: string | null;
  presensiBuka: string | null;
  presensiTutup: string | null;
};

/** Field checks shared by "add meeting" and "edit meeting". */
function telaahPertemuan(input: {
  judul: unknown;
  tanggal: unknown;
  terbit: unknown;
  videoUrl?: unknown;
  presensiBuka?: unknown;
  presensiTutup?: unknown;
}): { ok: true; isi: IsiPertemuan } | { ok: false; error: string } {
  const judul = teks(input.judul, 120);
  if (!judul) return { ok: false, error: "Judul pertemuan wajib diisi (maks. 120 karakter)." };

  const tanggal = String(input.tanggal ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return { ok: false, error: "Tanggal pertemuan wajib diisi." };
  }

  const buka = input.presensiBuka ? jam(input.presensiBuka) : null;
  const tutup = input.presensiTutup ? jam(input.presensiTutup) : null;
  if (input.presensiBuka && !buka) return { ok: false, error: "Jam buka presensi tidak valid." };
  if (input.presensiTutup && !tutup) return { ok: false, error: "Jam tutup presensi tidak valid." };
  if (buka && tutup && tutup <= buka) {
    return { ok: false, error: "Jam tutup presensi harus setelah jam buka." };
  }
  if ((buka && !tutup) || (!buka && tutup)) {
    return {
      ok: false,
      error: "Isi jam buka dan tutup presensi sekaligus, atau kosongkan keduanya.",
    };
  }

  // Link video bisa lebih dari satu — dipisah baris baru di kolom video_url
  // (pola yang sama dengan pecahBerkas untuk lampiran multi-file).
  const videoMentah = String(input.videoUrl ?? "");
  const videoBaris = videoMentah
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  const videoUrls: string[] = [];
  for (const baris of videoBaris) {
    const video = urlAtauNull(baris);
    if (!video.ok) {
      return { ok: false, error: `Link video tidak valid: ${baris}` };
    }
    videoUrls.push(video.url!);
  }

  return {
    ok: true,
    isi: {
      judul,
      tanggal,
      terbit: Boolean(input.terbit),
      videoUrl: videoUrls.length > 0 ? videoUrls.join("\n") : null,
      presensiBuka: buka,
      presensiTutup: tutup,
    },
  };
}

/**
 * The Calendar slot a meeting becomes.
 *
 * An hour long: the attendance window is a whole school day and scheduling the
 * Meet for all of it would make every event overlap. A teacher who wants longer
 * drags the event in Calendar; the room itself does not expire.
 */
function jadwalMeet(isi: IsiPertemuan): WaktuMeet {
  const mulai = isi.presensiBuka ?? "07:00";
  return {
    judul: isi.judul,
    tanggal: isi.tanggal,
    mulai,
    selesai: tambahJam(mulai, 60),
  };
}

/**
 * Validates and uploads the meeting's PDF attachment.
 *
 * The file keeps the name it was uploaded with (sanitised), filed under
 * `Pertemuan / <kelas>` — the same cabinet the task submissions use, just a
 * different drawer.
 */
type Lampiran =
  | { error: null; nama: string | null; url: string | null }
  | { error: string };

async function lampiranPertemuan(
  berkas: File | null | undefined,
  kelasNama: string,
): Promise<Lampiran> {
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { error: null, nama: null, url: null };
  }
  if (berkas.size > BATAS_BERKAS) {
    return { error: "Lampiran terlalu besar (maks. 10 MB)." };
  }
  if (berkas.type !== "application/pdf") {
    return { error: "Lampiran harus berupa berkas PDF." };
  }

  const namaBersih = berkas.name.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 200);
  if (!namaBersih) return { error: "Nama berkas tidak valid." };

  try {
    const hasil = await unggahKeDrive({
      nama: namaBersih,
      mime: berkas.type,
      data: Buffer.from(await berkas.arrayBuffer()),
      // Lampiran guru (pertemuan & tugas) masuk folder `Pertemuan` yang sama;
      // kelas jadi sub-folder, mengikuti laci per kelas seperti pengumpulan siswa.
      folderPath: ["Pertemuan", kelasNama],
    });
    return { error: null, nama: namaBersih, url: hasil.url };
  } catch (galat) {
    console.error(galat);
    return { error: (galat as Error).message };
  }
}

/**
 * Reuses a PDF this teacher already uploaded — the Drive copy is shared, so a
 * second class never re-uploads the same file. The URL comes from the client,
 * so it is checked against the teacher's own attachments first.
 */
async function lampiranReuse(
  guruId: string,
  url: string | null | undefined,
): Promise<Lampiran> {
  if (!url) return { error: null, nama: null, url: null };
  const milik = (await listLampiranGuru(guruId)).find((l) => l.url === url);
  if (!milik) return { error: "Lampiran itu bukan milik Anda." };
  return { error: null, nama: milik.nama, url: milik.url };
}

export async function tambahPertemuanAction(input: {
  ruangId: number;
  judul: string;
  tanggal: string;
  terbit: boolean;
  buatMeet?: boolean;
  materi?: string | null;
  videoUrl?: string | null;
  presensiBuka?: string | null;
  presensiTutup?: string | null;
  lampiran?: File | null;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah pertemuan." };

  const telaah = telaahPertemuan(input);
  if (!telaah.ok) return { error: telaah.error };

  const berkas = await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama);
  if (berkas.error !== null) return { error: berkas.error };
  const isiBerkas = berkas;

  let meet: { eventId: string; link: string } | null = null;
  if (input.buatMeet) {
    const hasil = await buatMeet(jadwalMeet(telaah.isi));
    if (!hasil.ok) return { error: hasil.error };
    meet = hasil;
  }

  const hasil = await tambahPertemuan({
    ruangId,
    ...telaah.isi,
    videoUrl: meet?.link ?? telaah.isi.videoUrl,
    googleEventId: meet?.eventId ?? null,
    materi: materiAtauNull(input.materi),
    lampiranNama: isiBerkas.nama,
    lampiranUrl: isiBerkas.url,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

/**
 * Creates one meeting in the current room and, when requested, copies it to
 * parallel rooms (same teacher, same subject, same school year).
 *
 * Google Meet stays single-room on purpose: the calendar slot is tied to this
 * class's schedule, and a shared meeting link across classes invites chaos.
 */
export async function tambahPertemuanBanyakAction(input: {
  ruangId: number;
  judul: string;
  tanggal: string;
  terbit: boolean;
  buatMeet?: boolean;
  materi?: string | null;
  videoUrl?: string | null;
  presensiBuka?: string | null;
  presensiTutup?: string | null;
  lampiran?: File | null;
  /** URL lampiran Drive milik guru ini — dipakai ulang, tanpa unggah baru. */
  lampiranLama?: string | null;
  /** Other room ids the same content is copied to. */
  ruangTambahan?: number[];
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah pertemuan." };

  const telaah = telaahPertemuan(input);
  if (!telaah.ok) return { error: telaah.error };

  // The extra rooms must be genuinely the teacher's parallel classes; ids from
  // the client are never trusted as-is.
  const sah = await listRuangSejenis(ruangId, user.id);
  const diminta = (input.ruangTambahan ?? [])
    .map((v) => id(v))
    .filter((v): v is number => v !== null);
  const ruangLain = sah
    .filter((r) => diminta.includes(r.id))
    .map((r) => r.id);

  const berkas =
    input.lampiran instanceof File && input.lampiran.size > 0
      ? await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama)
      : await lampiranReuse(user.id, input.lampiranLama);
  if (berkas.error !== null) return { error: berkas.error };
  const isiBerkas = berkas;

  let meet: { eventId: string; link: string } | null = null;
  if (input.buatMeet) {
    const hasil = await buatMeet(jadwalMeet(telaah.isi));
    if (!hasil.ok) return { error: hasil.error };
    meet = hasil;
  }

  const isi = {
    ...telaah.isi,
    videoUrl: meet?.link ?? telaah.isi.videoUrl,
    materi: materiAtauNull(input.materi),
    lampiranNama: isiBerkas.nama,
    lampiranUrl: isiBerkas.url,
    presensiBuka: telaah.isi.presensiBuka,
    presensiTutup: telaah.isi.presensiTutup,
  };

  if (ruangLain.length > 0) {
    const hasil = await tambahPertemuanBanyak([ruangId, ...ruangLain], isi);
    if (!hasil.ok) return { error: hasil.error };
  } else {
    const hasil = await tambahPertemuan({
      ruangId,
      judul: telaah.isi.judul,
      tanggal: telaah.isi.tanggal,
      terbit: telaah.isi.terbit,
      videoUrl: isi.videoUrl,
      googleEventId: meet?.eventId ?? null,
      materi: isi.materi,
      lampiranNama: isi.lampiranNama,
      lampiranUrl: isi.lampiranUrl,
      presensiBuka: isi.presensiBuka,
      presensiTutup: isi.presensiTutup,
    });
    if (!hasil.ok) return { error: hasil.error };
  }

  segarkan(ruangId);
  for (const ruang of ruangLain) segarkan(ruang);
  return { error: null };
}

export async function hapusPertemuanAction(input: {
  ruangId: number;
  pertemuanId: number;
  /** Teacher-confirmed wipe that also removes attendance and completion marks. */
  paksa?: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menghapus pertemuan." };

  // Read before delete: the Meet room is cancelled, not orphaned in Calendar.
  const lama = await getPertemuanDetail(ruangId, pertemuanId);

  const hasil = await hapusPertemuan({ ruangId, pertemuanId, paksa: input.paksa });
  if (!hasil.ok) return { error: hasil.error };

  // The delete above is the authority on "was attendance recorded"; cancelling
  // the event afterwards cannot resurrect the row.
  if (lama?.googleEventId) await hapusMeet(lama.googleEventId);

  segarkan(ruangId);
  return { error: null };
}

export async function ubahPertemuanAction(input: {
  ruangId: number;
  pertemuanId: number;
  judul: string;
  tanggal: string;
  terbit: boolean;
  buatMeet?: boolean;
  videoUrl?: string | null;
  presensiBuka?: string | null;
  presensiTutup?: string | null;
  lampiran?: File | null;
  hapusLampiran?: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const pertemuanId = id(input.pertemuanId);
  if (!ruangId || !pertemuanId) return { error: "Pertemuan tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengubah pertemuan." };

  const telaah = telaahPertemuan(input);
  if (!telaah.ok) return { error: telaah.error };

  const lama = await getPertemuanDetail(ruangId, pertemuanId);
  if (!lama) return { error: "Pertemuan tidak ditemukan di ruang ini." };

  const berkas = await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama);
  if (berkas.error !== null) return { error: berkas.error };
  const isiBerkas = berkas;
  const lampiranNama = isiBerkas.nama;
  const lampiranUrl = isiBerkas.url;

  // Replacing (or clearing) a file: the old copy goes first so Drive does not
  // accumulate an orphan per edit. A Drive failure here aborts the save, so the
  // LMS row never points at a file that is not there.
  if ((lampiranUrl || input.hapusLampiran) && lama.lampiranUrl) {
    try {
      await hapusDariDrive(lama.lampiranUrl);
    } catch (galat) {
      console.error(galat);
      return { error: "Lampiran lama gagal dihapus dari Drive. Coba lagi." };
    }
  }

  // Only touched when the box is ticked: an unticked box means "leave the link as
  // it is", not "delete the meeting in Google".
  let eventId = lama.googleEventId;
  let videoUrl = telaah.isi.videoUrl;
  if (input.buatMeet) {
    const slot = jadwalMeet(telaah.isi);
    const hasil = eventId ? await ubahMeet(eventId, slot) : await buatMeet(slot);
    if (!hasil.ok) return { error: hasil.error };
    eventId = hasil.eventId;
    videoUrl = hasil.link || videoUrl;
  }

  const hasil = await ubahPertemuan({
    ruangId,
    pertemuanId,
    ...telaah.isi,
    videoUrl,
    googleEventId: eventId,
    lampiranNama,
    lampiranUrl,
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
  deskripsi?: string | null;
  tenggat?: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
  lampiran?: File | null;
  tipeKerja?: "individu" | "kelompok";
  nilaiSama?: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah tugas." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul tugas wajib diisi (maks. 120 karakter)." };
  const deskripsi = teks(input.deskripsi, 4000);
  if (input.deskripsi && String(input.deskripsi).trim().length > 4000) {
    return { error: "Instruksi tugas maksimal 4000 karakter." };
  }

  const tipe = input.tipe;
  if (!["file", "teks", "keduanya"].includes(tipe)) {
    return { error: "Jenis pengumpulan tidak dikenal." };
  }

  const tipeKerja = input.tipeKerja === "kelompok" ? "kelompok" : "individu";

  const tenggat = input.tenggat ? tanggalJam(input.tenggat) : null;
  if (input.tenggat && !tenggat) return { error: "Tenggat tidak valid." };

  const berkas = await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama);
  if (berkas.error !== null) return { error: berkas.error };

  const hasil = await tambahTugas({
    ruangId,
    judul,
    deskripsi,
    tenggat,
    tipe,
    bolehTerlambat: Boolean(input.bolehTerlambat),
    terbit: Boolean(input.terbit),
    lampiranNama: berkas.nama,
    lampiranUrl: berkas.url,
    tipeKerja,
    nilaiSama: input.nilaiSama !== false,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

/**
 * Creates one task in the current room and copies it to parallel rooms (same
 * teacher, same subject, same school year). One transaction across all rooms:
 * a failure in the last class leaves no half-created task behind.
 */
export async function tambahTugasBanyakAction(input: {
  ruangId: number;
  judul: string;
  deskripsi?: string | null;
  tenggat?: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
  lampiran?: File | null;
  tipeKerja?: "individu" | "kelompok";
  nilaiSama?: boolean;
  /** Other room ids the same task is copied to. */
  ruangTambahan?: number[];
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const { user, akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menambah tugas." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul tugas wajib diisi (maks. 120 karakter)." };
  const deskripsi = teks(input.deskripsi, 4000);
  if (input.deskripsi && String(input.deskripsi).trim().length > 4000) {
    return { error: "Instruksi tugas maksimal 4000 karakter." };
  }

  const tipe = input.tipe;
  if (!["file", "teks", "keduanya"].includes(tipe)) {
    return { error: "Jenis pengumpulan tidak dikenal." };
  }

  const tipeKerja: "individu" | "kelompok" =
    input.tipeKerja === "kelompok" ? "kelompok" : "individu";

  const tenggat = input.tenggat ? tanggalJam(input.tenggat) : null;
  if (input.tenggat && !tenggat) return { error: "Tenggat tidak valid." };

  const sah = await listRuangSejenis(ruangId, user.id);
  const diminta = (input.ruangTambahan ?? [])
    .map((v) => id(v))
    .filter((v): v is number => v !== null);
  const ruangLain = sah
    .filter((r) => diminta.includes(r.id))
    .map((r) => r.id);

  const berkas = await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama);
  if (berkas.error !== null) return { error: berkas.error };

  const isi = {
    judul,
    deskripsi,
    tenggat,
    tipe,
    bolehTerlambat: Boolean(input.bolehTerlambat),
    terbit: Boolean(input.terbit),
    lampiranNama: berkas.nama,
    lampiranUrl: berkas.url,
    tipeKerja,
    nilaiSama: input.nilaiSama !== false,
  };

  if (ruangLain.length > 0) {
    const hasil = await tambahTugasBanyak([ruangId, ...ruangLain], isi);
    if (!hasil.ok) return { error: hasil.error };
  } else {
    const hasil = await tambahTugas({ ruangId, ...isi });
    if (!hasil.ok) return { error: hasil.error };
  }

  segarkan(ruangId);
  for (const ruang of ruangLain) segarkan(ruang);
  return { error: null };
}

export async function ubahTugasAction(input: {
  ruangId: number;
  tugasId: number;
  judul: string;
  deskripsi?: string | null;
  tenggat?: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
  lampiran?: File | null;
  hapusLampiran?: boolean;
  tipeKerja?: "individu" | "kelompok";
  nilaiSama?: boolean;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengubah tugas." };

  const judul = teks(input.judul, 120);
  if (!judul) return { error: "Judul tugas wajib diisi (maks. 120 karakter)." };
  const deskripsi = teks(input.deskripsi, 4000);
  if (input.deskripsi && String(input.deskripsi).trim().length > 4000) {
    return { error: "Instruksi tugas maksimal 4000 karakter." };
  }

  const tipe = input.tipe;
  if (!"file teks keduanya".split(" ").includes(tipe)) {
    return { error: "Jenis pengumpulan tidak dikenal." };
  }

  const tipeKerja =
    input.tipeKerja === "kelompok"
      ? "kelompok"
      : input.tipeKerja === "individu"
        ? "individu"
        : undefined;

  const tenggat = input.tenggat ? tanggalJam(input.tenggat) : null;
  if (input.tenggat && !tenggat) return { error: "Tenggat tidak valid." };

  const lama = await getTugasDetail(ruangId, tugasId);
  if (!lama) return { error: "Tugas tidak ditemukan di ruang ini." };

  const berkas = await lampiranPertemuan(input.lampiran, akses.ruang.kelasNama);
  if (berkas.error !== null) return { error: berkas.error };
  const lampiranNama = berkas.nama;
  const lampiranUrl = berkas.url;

  // Lampiran lama dibuang dari Drive saat diganti berkas baru atau saat
  // guru menandainya untuk dihapus.
  if ((lampiranUrl || input.hapusLampiran) && lama.lampiranUrl) {
    try {
      await hapusDariDrive(lama.lampiranUrl);
    } catch (galat) {
      console.error(galat);
      return { error: "Lampiran lama gagal dihapus dari Drive. Coba lagi." };
    }
  }

  const hasil = await ubahTugas({
    ruangId,
    tugasId,
    judul,
    deskripsi,
    tenggat,
    tipe,
    bolehTerlambat: Boolean(input.bolehTerlambat),
    terbit: Boolean(input.terbit),
    lampiranNama,
    lampiranUrl,
    tipeKerja,
    nilaiSama: input.nilaiSama === undefined ? undefined : Boolean(input.nilaiSama),
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null };
}

/**
 * Delete one student's submission on a task. The SQL delete is the authority;
 * Drive cleanup runs after it, best-effort — a failed file delete must not
 * resurrect the row, and the teacher can always remove the file manually.
 */
export async function hapusPengumpulanAction(input: {
  ruangId: number;
  tugasId: number;
  siswaId: string;
  kelompokId?: number | null;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  const siswaId = teks(input.siswaId, 64);
  if (!ruangId || !tugasId || !siswaId) {
    return { error: "Pengumpulan tidak ditemukan." };
  }

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) {
    return { error: "Hanya guru pengampu yang bisa menghapus pengumpulan." };
  }

  const hasil = await hapusPengumpulan({
    ruangId,
    tugasId,
    siswaId,
    kelompokId: input.kelompokId ?? null,
  });
  if (!hasil.ok) return { error: "Pengumpulan tidak ditemukan atau sudah terhapus." };

  for (const url of hasil.fileUrls) {
    try {
      await hapusDariDrive(url);
    } catch {
      // Best-effort: the database row is gone, which is what matters.
    }
  }

  segarkan(ruangId);
  return { error: null };
}

export async function hapusTugasAction(input: {
  ruangId: number;
  tugasId: number;
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menghapus tugas." };

  const lama = await getTugasDetail(ruangId, tugasId);

  const hasil = await hapusTugas({ ruangId, tugasId });
  if (!hasil.ok) return { error: hasil.error };

  // Best-effort: baris sudah terhapus, berkas Drive menyusul kalau bisa.
  if (lama?.lampiranUrl) {
    try {
      await hapusDariDrive(lama.lampiranUrl);
    } catch {
      // biarkan — data database sudah aman
    }
  }

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
 *
 * A file, when there is one, goes to Google Drive first and only its link is
 * stored: nothing binary ever lands in Postgres.
 */
export async function kirimTugasAction(input: {
  ruangId: number;
  tugasId: number;
  teks: string;
  /** One or more photos/PDFs; each is a Drive upload under the student's name. */
  files?: File[] | null;
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
  if (isi.length > 5000) {
    return { error: "Jawaban terlalu panjang (maks. 5000 karakter)." };
  }

  const daftar = (Array.isArray(input.files) ? input.files : []).filter(
    (berkas) => berkas instanceof File && berkas.size > 0,
  );
  if (!isi && daftar.length === 0) {
    return { error: "Tulis jawaban atau pilih berkas dulu sebelum mengumpulkan." };
  }
  if (daftar.length > 10) {
    return { error: "Maksimal 10 berkas per pengumpulan." };
  }

  // The client already compresses and refuses oversize files; this re-check
  // exists for the direct-API path. Total payload matters too — Vercel cuts
  // the request at 4.5 MB before this code ever runs, so the sum is what the
  // guard watches, not each file alone.
  const totalByte = daftar.reduce((jumlah, berkas) => jumlah + berkas.size, 0);
  if (totalByte > 4.2 * 1024 * 1024) {
    return {
      error:
        "Ukuran total berkas melebihi batas. Padatkan foto atau kirim berkas lebih kecil.",
    };
  }

  let fileUrl: string | null = null;
  if (daftar.length > 0) {
    const tugas = await getTugasDetail(ruangId, tugasId);
    if (!tugas) return { error: "Tugas tidak ditemukan." };

    for (const berkas of daftar) {
      if (berkas.size > BATAS_BERKAS) {
        return { error: `"${berkas.name}" terlalu besar (maks. 4 MB per berkas).` };
      }
      if (!MIME_DIIZINKAN.includes(berkas.type)) {
        return { error: `"${berkas.name}" harus foto (JPG/PNG/WebP) atau PDF.` };
      }
    }

    // Old copies go first: it frees the base name, so the new set is still
    // "Nama.jpg", "Nama-2.jpg" … without bumping into Drive dedup suffixes.
    const sebelumnya = (await getPengumpulanSiswa(tugasId, user.id)).fileUrl;
    if (sebelumnya) {
      try {
        await hapusDariDrive(sebelumnya);
      } catch (galat) {
        console.error(galat);
        return { error: "Berkas lama gagal dihapus dari Drive. Coba kirim lagi." };
      }
    }

    const dasar = user.name.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 100) || "siswa";

    const tautan: string[] = [];
    try {
      for (let i = 0; i < daftar.length; i++) {
        const berkas = daftar[i];
        const ekstensi = (berkas.name.split(".").pop() ?? "bin")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 5);
        // One photo keeps the plain name; several become "Nama-2.jpg" etc.
        const namaBerkas =
          daftar.length === 1
            ? `${dasar}.${ekstensi}`
            : `${dasar}-${i + 2}.${ekstensi}`;

        const hasil = await unggahKeDrive({
          nama: namaBerkas,
          mime: berkas.type,
          data: Buffer.from(await berkas.arrayBuffer()),
          folderPath: [akses.ruang.kelasNama, tugas.judul],
        });
        tautan.push(hasil.url);
      }
      fileUrl = tautan.join("\n");
    } catch (galat) {
      console.error(galat);
      // Whatever made it to Drive is already orphaned; the row must stop
      // pointing at the old set, which is gone.
      if (sebelumnya) await kosongkanBerkasPengumpulan(tugasId, user.id);
      return {
        error:
          galat instanceof Error
            ? galat.message
            : "Berkas gagal diunggah ke Google Drive.",
      };
    }
  }

  const hasil = await simpanPengumpulan({
    ruangId,
    tugasId,
    siswaId: user.id,
    kelasId: akses.ruang.kelasId,
    teks: isi || null,
    fileUrl,
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
  /** Group-task shared grades (nilai_sama mode), one per group. */
  nilaiKelompok?: { kelompokId: number; nilai: number | null }[];
}): Promise<HasilAksi> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa menilai tugas." };

  const daftar = Array.isArray(input.entri) ? input.entri : [];
  if (daftar.length > 500) return { error: "Terlalu banyak baris sekaligus." };

  /** Valid number 0–100, null for empty, NaN for invalid — mirrors the sheet. */
  const cekNilai = (mentah: unknown): number | null => {
    if (mentah === null || mentah === undefined || String(mentah).trim() === "") {
      return null;
    }
    const angka = Number(mentah);
    return Number.isInteger(angka) && angka >= 0 && angka <= 100 ? angka : NaN;
  };

  const entri: { siswaId: string; nilai: number | null }[] = [];
  for (const baris of daftar) {
    const siswaId = String(baris?.siswaId ?? "").trim();
    if (!siswaId) return { error: "Ada baris nilai tanpa siswa." };

    const nilai = cekNilai(baris?.nilai);
    if (Number.isNaN(nilai)) return { error: "Nilai harus bilangan bulat 0–100." };
    entri.push({ siswaId, nilai });
  }

  const kelompok: { kelompokId: number; nilai: number | null }[] = [];
  for (const baris of Array.isArray(input.nilaiKelompok) ? input.nilaiKelompok : []) {
    const kelompokId = id(baris?.kelompokId);
    if (!kelompokId) return { error: "Ada baris nilai tanpa kelompok." };
    const nilai = cekNilai(baris?.nilai);
    if (Number.isNaN(nilai)) return { error: "Nilai harus bilangan bulat 0–100." };
    kelompok.push({ kelompokId, nilai });
  }

  const hasil = await simpanNilaiTugas({
    ruangId,
    tugasId,
    kelasId: akses.ruang.kelasId,
    entri,
    nilaiKelompok: kelompok,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkanTugas(ruangId, tugasId);
  return { error: null };
}

// ------------------------------------------------------------ tugas kelompok

/** Saves the whole group set of one task, replacing what was there. */
export async function simpanKelompokAction(input: {
  ruangId: number;
  tugasId: number;
  kelompok: { id: number | null; nama: string; siswaIds: string[] }[];
}): Promise<HasilAksi & { kelompok?: KelompokRow[] }> {
  const ruangId = id(input.ruangId);
  const tugasId = id(input.tugasId);
  if (!ruangId || !tugasId) return { error: "Tugas tidak ditemukan." };

  const { akses, boleh } = await siapkan(ruangId);
  if (!akses) return { error: "Anda tidak punya akses ke ruang ini." };
  if (!boleh) return { error: "Hanya guru pengampu yang bisa mengatur kelompok." };

  const daftar = Array.isArray(input.kelompok) ? input.kelompok : [];
  if (daftar.length > 50) return { error: "Terlalu banyak kelompok sekaligus." };

  const bersih = daftar.map((k) => ({
    id: k?.id ? id(k.id) : null,
    nama: String(k?.nama ?? "").trim(),
    siswaIds: Array.isArray(k?.siswaIds)
      ? k.siswaIds.map((s: unknown) => String(s)).slice(0, 200)
      : [],
  }));

  const hasil = await simpanKelompok({
    ruangId,
    tugasId,
    kelompok: bersih,
  });
  if (!hasil.ok) return { error: hasil.error };

  segarkan(ruangId);
  return { error: null, kelompok: await listKelompok(ruangId, tugasId) };
}
