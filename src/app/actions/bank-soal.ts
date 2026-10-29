"use server";

import { revalidatePath } from "next/cache";

import {
  bolehMapel,
  getTopik,
  hapusBankSoal,
  hapusTopik,
  imporBankSoal,
  tambahBankSoal,
  tambahTopik,
  ubahBankSoal,
  ubahTopik,
} from "@/lib/bank-soal";
import { soalBankSiap, type JenisSoalBank } from "@/lib/bank-soal-shared";
import { parseSoalTeks } from "@/lib/ruang-belajar-shared";
import { requireRole } from "@/lib/session";

export type HasilBank = { error: string | null };

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Every screen that lists or shows bank questions. */
function segarkanBank(topikId?: number) {
  revalidatePath("/guru/bank-soal");
  if (topikId) revalidatePath(`/guru/bank-soal/topik/${topikId}`);
}

/**
 * Resolves the subject and proves the teacher may keep a bank for it.
 *
 * The picker only offers subjects the teacher holds a room for, but a server
 * action is reachable by hand, so the rule is enforced here rather than trusted
 * from the form. `mapelId` may be null only when the teacher has no room at
 * all — an edge case that would otherwise make the very first topic unsaveable.
 */
async function siapkanMapel(
  guruId: string,
  nilai: unknown,
): Promise<{ mapelId: number | null } | { error: string }> {
  if (nilai === null || nilai === undefined || nilai === "") return { mapelId: null };

  const mapelId = id(nilai);
  if (!mapelId) return { error: "Mata pelajaran tidak valid." };

  if (!(await bolehMapel(guruId, mapelId))) {
    return { error: "Anda tidak mengampu mata pelajaran itu." };
  }
  return { mapelId };
}

/** Same rule as the subject, for the topic that owns the question. */
async function siapkanTopik(
  guruId: string,
  nilai: unknown,
): Promise<{ topikId: number } | { error: string }> {
  const topikId = id(nilai);
  if (!topikId) return { error: "Topik tidak ditemukan." };
  const topik = await getTopik(guruId, topikId);
  if (!topik) return { error: "Topik itu bukan milik Anda." };
  return { topikId };
}

function bacaJenis(value: unknown): JenisSoalBank {
  return value === "esai" ? "esai" : "pg";
}

function bacaPilihan(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const hasil: Record<string, string> = {};
  for (const [huruf, isi] of Object.entries(value as Record<string, unknown>)) {
    hasil[huruf] = String(isi ?? "");
  }
  return hasil;
}

function bacaBobot(value: unknown): number | null {
  const bobot = Number(value ?? 1);
  if (!Number.isInteger(bobot) || bobot < 1 || bobot > 100) return null;
  return bobot;
}

// ------------------------------------------------------------------- topik

export async function tambahTopikAction(input: {
  nama: string;
  mapelId: number | string | null;
}): Promise<HasilBank & { id?: number }> {
  const user = await requireRole("guru");

  const mapel = await siapkanMapel(user.id, input.mapelId);
  if ("error" in mapel) return { error: mapel.error };

  const hasil = await tambahTopik(user.id, String(input.nama ?? ""), mapel.mapelId);
  if (!hasil.ok) return { error: hasil.error };

  segarkanBank(hasil.id);
  return { error: null, id: hasil.id };
}

export async function ubahTopikAction(input: {
  topikId: number;
  nama: string;
  mapelId: number | string | null;
}): Promise<HasilBank> {
  const user = await requireRole("guru");

  const topik = await siapkanTopik(user.id, input.topikId);
  if ("error" in topik) return { error: topik.error };

  const mapel = await siapkanMapel(user.id, input.mapelId);
  if ("error" in mapel) return { error: mapel.error };

  const hasil = await ubahTopik(user.id, topik.topikId, String(input.nama ?? ""), mapel.mapelId);
  if (!hasil.ok) return { error: hasil.error };

  segarkanBank(topik.topikId);
  return { error: null };
}

export async function hapusTopikAction(input: {
  topikId: number;
}): Promise<HasilBank & { soal: number }> {
  const user = await requireRole("guru");
  const topikId = id(input.topikId);
  if (!topikId) return { error: "Topik tidak ditemukan.", soal: 0 };

  const hasil = await hapusTopik(user.id, topikId);
  if (!hasil.ok) return { error: hasil.error, soal: 0 };

  revalidatePath("/guru/bank-soal");
  return { error: null, soal: hasil.soal };
}

// -------------------------------------------------------------------- soal

export async function simpanBankSoalAction(input: {
  bankId: number | null;
  topikId: number;
  jenis: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  bobot: number;
}): Promise<HasilBank & { id?: number }> {
  const user = await requireRole("guru");

  const topik = await siapkanTopik(user.id, input.topikId);
  if ("error" in topik) return { error: topik.error };

  const jenis = bacaJenis(input.jenis);
  const pertanyaan = String(input.pertanyaan ?? "").trim();
  if (!pertanyaan) return { error: "Pertanyaan wajib diisi." };
  if (pertanyaan.length > 2000) {
    return { error: "Pertanyaan terlalu panjang (maks. 2000 karakter)." };
  }

  const bobot = bacaBobot(input.bobot);
  if (bobot === null) return { error: "Bobot harus bilangan bulat 1–100." };

  const pilihan = jenis === "pg" ? bacaPilihan(input.pilihan) : {};
  const jawaban = jenis === "pg" ? (input.jawaban ?? null) : null;

  const siap = soalBankSiap({ jenis, pertanyaan, pilihan, jawaban });
  if (!siap.ok) return { error: siap.alasan };

  const soal = { jenis, pertanyaan, pilihan, jawaban, bobot };

  const bankId = id(input.bankId);
  if (bankId) {
    const hasil = await ubahBankSoal(user.id, bankId, soal);
    if (!hasil.ok) return { error: hasil.error };
    segarkanBank(topik.topikId);
    revalidatePath(`/guru/bank-soal/soal/${bankId}`);
    return { error: null, id: bankId };
  }

  const hasil = await tambahBankSoal(user.id, topik.topikId, soal);
  if (!hasil.ok) return { error: hasil.error };
  segarkanBank(topik.topikId);
  return { error: null, id: hasil.id };
}

export async function hapusBankSoalAction(input: { bankId: number }): Promise<HasilBank> {
  const user = await requireRole("guru");
  const bankId = id(input.bankId);
  if (!bankId) return { error: "Soal tidak ditemukan." };

  const hasil = await hapusBankSoal(user.id, bankId);
  if (!hasil.ok) return { error: hasil.error };

  segarkanBank(hasil.topikId ?? undefined);
  revalidatePath(`/guru/bank-soal/soal/${bankId}`);
  return { error: null };
}

/**
 * Bulk import. The text is parsed on the server so what is stored cannot differ
 * from what the preview showed — same rule as the quiz importer.
 */
export async function imporBankSoalAction(input: {
  topikId: number;
  teks: string;
}): Promise<HasilBank & { jumlah: number; dilewati: number; galat: string[] }> {
  const user = await requireRole("guru");

  const kosong = { error: null, jumlah: 0, dilewati: 0, galat: [] as string[] };

  const topik = await siapkanTopik(user.id, input.topikId);
  if ("error" in topik) return { ...kosong, error: topik.error };

  const teks = String(input.teks ?? "");
  if (teks.length > 100_000) {
    return { ...kosong, error: "Teks terlalu panjang (maks. 100.000 karakter)." };
  }

  const { soal, galat } = parseSoalTeks(teks);
  if (soal.length === 0) {
    return {
      ...kosong,
      error: "Tidak ada soal yang bisa dibaca dari teks itu.",
      galat,
    };
  }

  const hasil = await imporBankSoal(
    user.id,
    topik.topikId,
    soal.map((item) => ({
      jenis: item.jenis,
      pertanyaan: item.pertanyaan,
      pilihan: item.pilihan,
      jawaban: item.jawaban,
      bobot: item.bobot,
    })),
  );
  if (!hasil.ok) return { ...kosong, error: hasil.error, galat };

  segarkanBank(topik.topikId);
  return { error: null, jumlah: hasil.jumlah, dilewati: hasil.dilewati, galat };
}