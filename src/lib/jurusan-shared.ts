/**
 * Pure helpers and types for the Jurusan screen.
 *
 * Kept apart from `lib/jurusan.ts` for the same reason `kelas-shared.ts` is: the
 * data layer opens a Postgres pool, and the jurusan dialog is a Client
 * Component.
 */
import type { Jenjang } from "@/lib/kelas-shared";

export const KODE_MAX = 15;
export const NAMA_MAX = 120;

/** Rows per page — same window as the other master-data screens. */
export const JURUSAN_PER_PAGE = 10;

/**
 * The same table, two names. SMK calls its majors "program keahlian", SMA calls
 * its tracks "peminatan" — the rows are identical either way.
 */
export function istilahJurusan(jenjang: Jenjang): string {
  return jenjang === "SMA" ? "peminatan" : "program keahlian";
}

export function istilahJurusanKapital(jenjang: Jenjang): string {
  const istilah = istilahJurusan(jenjang);
  return istilah.charAt(0).toUpperCase() + istilah.slice(1);
}

/** Majors only exist for SMA/SMK; for SD/SMP the menu is hidden entirely. */
export function jenjangPunyaJurusan(jenjang: Jenjang): boolean {
  return jenjang === "SMA" || jenjang === "SMK";
}

/** Codes are identity, not prose: TKJ, AKL, BD. */
export function normaliseKode(value: string): string {
  return value.trim().toUpperCase();
}

export type JurusanRow = {
  id: number;
  kode: string;
  nama: string;
  /** Classes pointing at this major. */
  kelasCount: number;
};

export type ListJurusanResult = {
  rows: JurusanRow[];
  total: number;
  page: number;
  pageCount: number;
};

export type JurusanStats = {
  total: number;
  /** Classes that sit in some major. */
  kelas: number;
  /** Classes with no major at all. */
  tanpaJurusan: number;
};

/** What one fetch of the major screen returns — rows plus the stat strip. */
export type JurusanPageData = ListJurusanResult & { stats: JurusanStats };
