/**
 * Pure helpers and types for the Pembagian Mengajar screen.
 *
 * Kept apart from `lib/pembagian.ts` for the usual reason: that module opens a
 * Postgres pool, and the board is a Client Component.
 */

/** 1 = Monday … 6 = Saturday, matching the CHECK on `jadwal.hari`. */
export const HARI = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
] as const;

export const JAM_MULAI_DEFAULT = "07:30";
export const JAM_SELESAI_DEFAULT = "09:00";

export function namaHari(hari: number): string {
  return HARI.find((item) => item.value === hari)?.label ?? `Hari ${hari}`;
}

/** "07:30:00" and "07:30" both become "07:30". */
export function rapikanJam(value: string): string {
  return value.slice(0, 5);
}

export function jamValid(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export type JadwalSlot = {
  id: number;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  linkMeet: string | null;
};

export type RuangRow = {
  id: number;
  mapelId: number;
  kode: string;
  nama: string;
  guruId: string | null;
  guruNama: string | null;
  jadwal: JadwalSlot[];
};

export type MapelOption = { id: number; kode: string; nama: string };
export type GuruOption = { id: string; name: string };
export type KelasRingkas = { id: number; nama: string; tingkat: number | null };
export type TahunAktif = { id: number; nama: string; semester: string };

/** Everything the two cards need for one class in the active year. */
export type Board = {
  kelas: { id: number; nama: string };
  ta: TahunAktif;
  /** Rooms of this class, ordered by mapel name. */
  ruang: RuangRow[];
  /** Subjects that do not have a room in this class yet. */
  tersedia: MapelOption[];
  guru: GuruOption[];
};
