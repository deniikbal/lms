/**
 * Pure helpers and types for the question bank (`/guru/bank-soal`).
 *
 * No database import here: the bank's editor and its picker both run on the
 * client, and `lib/bank-soal.ts` opens a Postgres pool.
 *
 * The bank is owned by a teacher and scoped to one subject. A question written
 * here can be assigned into any number of quizzes — including quizzes in other
 * classes and other years — without being retyped.
 *
 * The working unit is the **topic**, and a topic is a row (`topik_bank`), not a
 * word typed into each question. A teacher creates "Laju Reaksi" once, opens
 * it, and writes its questions there; nothing else has to name the topic again.
 */

import { bandingAlami } from "@/lib/ruang-belajar-shared";

/** The option letters the editor offers, A–E. */
export const HURUF = ["A", "B", "C", "D", "E"] as const;

export type JenisSoalBank = "pg" | "esai";

export function labelJenisSoalBank(jenis: JenisSoalBank): string {
  return jenis === "pg" ? "Pilihan ganda" : "Esai";
}

/** One question as it lives in the bank. */
export type BankSoalRow = {
  id: number;
  topikId: number | null;
  mapelId: number | null;
  mapelKode: string | null;
  mapelNama: string | null;
  jenis: JenisSoalBank;
  pertanyaan: string;
  /** `{ A: "…", B: "…" }` — empty for an essay. */
  pilihan: Record<string, string>;
  /** The correct option key; null for an essay. */
  jawaban: string | null;
  bobot: number;
  /** Kept in step with the topic row, for the quiz's own copy of the label. */
  topik: string | null;
  /** How many quiz questions were copied from this bank row. */
  dipakai: number;
  /** `YYYY-MM-DD HH24:MI`, Asia/Jakarta. */
  dibuat: string;
  diperbarui: string;
};

/** A subject the signed-in teacher actually teaches — the bank's only scopes. */
export type MapelBankOption = {
  id: number;
  kode: string;
  nama: string;
  /** How many rooms this teacher holds for the subject. */
  ruang: number;
  /** How many questions the bank already holds for it. */
  soal: number;
};

export type FilterBank = {
  mapelId: number | null;
  jenis: JenisSoalBank | null;
  cari: string;
};

export const FILTER_KOSONG: FilterBank = {
  mapelId: null,
  jenis: null,
  cari: "",
};

/** Reads a filter back out of the URL, discarding anything unrecognised. */
export function bacaFilter(params: Record<string, string | undefined>): FilterBank {
  const mapelId = Number(params.mapel);
  const cari = (params.cari ?? "").trim();
  return {
    mapelId: Number.isInteger(mapelId) && mapelId > 0 ? mapelId : null,
    jenis: params.jenis === "pg" || params.jenis === "esai" ? params.jenis : null,
    cari: cari.slice(0, 100),
  };
}

/** Turns a filter back into a query string, dropping the empty parts. */
export function kueriFilter(filter: FilterBank): string {
  const params = new URLSearchParams();
  if (filter.mapelId) params.set("mapel", String(filter.mapelId));
  if (filter.jenis) params.set("jenis", String(filter.jenis));
  if (filter.cari) params.set("cari", filter.cari);
  const isi = params.toString();
  return isi ? `?${isi}` : "";
}

/**
 * One topic as the bank list shows it.
 *
 * The counts are what a teacher checks before handing the topic to a class:
 * ten questions and eighteen points is a quiz, two questions is a draft.
 */
export type TopikRingkas = {
  id: number;
  nama: string;
  mapelId: number | null;
  mapelKode: string | null;
  mapelNama: string | null;
  soal: number;
  jumlahPg: number;
  jumlahEsai: number;
  /** Total points in the topic — exactly what assigning it adds to a quiz. */
  bobot: number;
  /** How many quiz questions were copied from this topic. */
  dipakai: number;
  /** `YYYY-MM-DD HH24:MI`, Asia/Jakarta. */
  diperbarui: string;
};

/**
 * Marks the options that `jawaban` does not use.
 *
 * Used by the editor to keep the key in range when an option is emptied: a
 * blank option cannot be the correct answer, and a key pointing at a removed
 * option would score every student wrong.
 */
export function kunciSah(
  pilihan: Record<string, string>,
  jawaban: string | null,
): string | null {
  const terisi = HURUF.filter((huruf) => (pilihan[huruf] ?? "").trim() !== "");
  if (!jawaban || !terisi.includes(jawaban as (typeof HURUF)[number])) {
    return terisi[0] ?? null;
  }
  return jawaban;
}

/** A question is assignable only when it has something to score. */
export function soalBankSiap(soal: {
  jenis: JenisSoalBank;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
}): { ok: true } | { ok: false; alasan: string } {
  if (soal.pertanyaan.trim() === "") {
    return { ok: false, alasan: "Pertanyaan masih kosong." };
  }
  if (soal.jenis === "pg") {
    const terisi = HURUF.filter((huruf) => (soal.pilihan[huruf] ?? "").trim() !== "");
    if (terisi.length < 2) {
      return { ok: false, alasan: "Pilihan ganda butuh minimal dua opsi terisi." };
    }
    if (!soal.jawaban || !terisi.includes(soal.jawaban as (typeof HURUF)[number])) {
      return { ok: false, alasan: "Kunci jawaban belum dipilih." };
    }
  }
  return { ok: true };
}

/** Sorts topics naturally by subject, then by name. */
export function urutkanTopik<T extends { nama: string; mapelNama: string | null }>(
  daftar: T[],
): T[] {
  return [...daftar].sort(
    (a, b) => bandingAlami(a.mapelNama, b.mapelNama) || bandingAlami(a.nama, b.nama),
  );
}