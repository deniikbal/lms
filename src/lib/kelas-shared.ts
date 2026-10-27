/**
 * Pure helpers and types for the Kelas screen.
 *
 * Kept apart from `lib/kelas.ts` on purpose: that module opens a Postgres pool,
 * and the class form is a Client Component. Importing the data layer there would
 * drag `pg` (and its `node:` builtins) into the browser bundle.
 */

/** School level — set once in Pengaturan, drives the class form. */
export type Jenjang = "SD" | "SMP" | "SMA" | "SMK";

const TINGKAT_PER_JENJANG: Record<Jenjang, number[]> = {
  SD: [1, 2, 3, 4, 5, 6],
  SMP: [7, 8, 9],
  SMA: [10, 11, 12],
  SMK: [10, 11, 12],
};

/** Class-name placeholder shown in the form, per level. */
const CONTOH_NAMA: Record<Jenjang, string> = {
  SD: "4A",
  SMP: "VIII B",
  SMA: "XI IPA 2",
  SMK: "X TKJ 1",
};

export const NAMA_MAX = 40;

/** Rows per page on the class list — matches the people screens. */
export const KELAS_PER_PAGE = 10;

export function isJenjang(value: unknown): value is Jenjang {
  return value === "SD" || value === "SMP" || value === "SMA" || value === "SMK";
}

export function tingkatOptions(jenjang: Jenjang): number[] {
  return TINGKAT_PER_JENJANG[jenjang];
}

/** Only SMA/SMK have majors. */
export function hasJurusan(jenjang: Jenjang): boolean {
  return jenjang === "SMA" || jenjang === "SMK";
}

export function contohNama(jenjang: Jenjang): string {
  return CONTOH_NAMA[jenjang];
}

export type KelasRow = {
  id: number;
  nama: string;
  tingkat: number | null;
  jurusanId: number | null;
  jurusanKode: string | null;
  jurusanNama: string | null;
  waliId: string | null;
  waliNama: string | null;
  siswaCount: number;
  ruangCount: number;
};

export type JurusanOption = { id: number; kode: string; nama: string };

export type WaliOption = { id: string; name: string; nip: string | null };

export type ListKelasResult = {
  rows: KelasRow[];
  total: number;
  page: number;
  pageCount: number;
};

export type KelasStats = {
  total: number;
  siswa: number;
  tanpaWali: number;
  ruang: number;
};

/** What one fetch of the class screen returns — rows plus the stat strip. */
export type KelasPageData = ListKelasResult & { stats: KelasStats };
