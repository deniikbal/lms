/**
 * Pure helpers and types for the Tahun Ajaran screen.
 *
 * Kept apart from `lib/tahun-ajaran.ts` so the Client Components can import
 * types without pulling in `pg`.
 */

export type Semester = "Ganjil" | "Genap";

export type TahunAjaranRow = {
  id: number;
  nama: string;
  semester: Semester;
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

/** One page of data returned by the list action. */
export type ListTahunAjaranResult = {
  rows: TahunAjaranRow[];
};

/** Form input shape (used by both create & update). */
export type TahunAjaranInput = {
  nama: string;
  semester: Semester;
  aktif: boolean;
};