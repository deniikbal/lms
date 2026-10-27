/**
 * Pure helpers and types for the Mata Pelajaran screen.
 *
 * Kept apart from `lib/mapel.ts` for the same reason `kelas-shared.ts` is: the
 * data layer opens a Postgres pool, and the subject dialog is a Client
 * Component. Importing the pool there would drag `pg` into the browser bundle.
 */

/** The only three kinds of subject. Mirrors the CHECK on `mapel.kelompok`. */
export const KELOMPOK = ["Umum", "Kejuruan", "Muatan Lokal"] as const;

export type Kelompok = (typeof KELOMPOK)[number];

export const KODE_MAX = 15;
export const NAMA_MAX = 120;

/** Rows per page — same window as the other master-data screens. */
export const MAPEL_PER_PAGE = 10;

export function isKelompok(value: unknown): value is Kelompok {
  return KELOMPOK.includes(value as Kelompok);
}

/**
 * Order used everywhere a list of subjects is grouped. Alphabetical would put
 * Kejuruan first, which buries the general subjects every class takes.
 */
export const KELOMPOK_ORDER: Record<Kelompok, number> = {
  Umum: 0,
  Kejuruan: 1,
  "Muatan Lokal": 2,
};

/** Subjects are identified by a short uppercase code: MTK, BIN, DTKJ. */
export function normaliseKode(value: string): string {
  return value.trim().toUpperCase();
}

export type MapelRow = {
  id: number;
  kode: string;
  nama: string;
  kelompok: Kelompok;
  /** How many rooms (mapel × class × year) use this subject — all years. */
  dipakai: number;
};

export type ListMapelResult = {
  rows: MapelRow[];
  total: number;
  page: number;
  pageCount: number;
};

export type MapelStats = {
  total: number;
  umum: number;
  kejuruan: number;
  lokal: number;
  dipakai: number;
  ruang: number;
};

/** What one fetch of the subject screen returns — rows plus the stat strip. */
export type MapelPageData = ListMapelResult & { stats: MapelStats };
