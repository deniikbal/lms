/**
 * Pure types and constants for the people screens.
 *
 * Kept apart from `lib/people.ts` because that module opens a Postgres pool —
 * and the student table is a Client Component. Same rule as `kelas-shared`.
 */

/** Rows shown per page in the admin people screens (default). */
export const PEOPLE_PER_PAGE = 25;

/** The student list uses a shorter page so the table stays scannable. */
export const SISWA_PER_PAGE = 10;

/** Teachers use the same window as students so the two screens match. */
export const GURU_PER_PAGE = 10;

export type PersonRow = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  jk: "L" | "P" | null;
  kelasId: number | null;
  kelasNama: string | null;
  /** Classes this person is homeroom teacher of — teachers only, comma-joined. */
  waliKelas: string | null;
  aktif: boolean;
  terakhirAktifAt: Date | null;
};

export type KelasOption = { id: number; nama: string };

export type ListPeopleResult = {
  rows: PersonRow[];
  total: number;
  page: number;
  pageCount: number;
};

export type PeopleSummary = {
  total: number;
  aktif: number;
  nonaktif: number;
  tanpaKelas: number;
  /** How many of these people are homeroom teacher of at least one class. */
  waliKelas: number;
};
