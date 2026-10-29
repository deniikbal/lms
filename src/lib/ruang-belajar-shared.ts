/**
 * Pure helpers and types for the room page (`/guru/ruang/[id]`).
 *
 * No database import here: the tabs that show badges run on the client, and
 * `lib/ruang-belajar.ts` opens a Postgres pool.
 */

export type PeranRuang = "guru" | "siswa" | "admin";

export type TabKey =
  | "materi"
  | "tugas"
  | "kuis"
  | "presensi"
  | "nilai"
  | "diskusi"
  | "anggota"
  | "pengaturan";

/**
 * The tabs, in the order a teacher works through a term.
 *
 * `label` stays here because the tab bar, the page `<title>` and any future
 * breadcrumb all need the same word; the icon mapping lives with the bar itself
 * so this file stays free of React.
 */
export const TABS: { key: TabKey; label: string }[] = [
  { key: "materi", label: "Materi" },
  { key: "tugas", label: "Tugas" },
  { key: "kuis", label: "Kuis" },
  { key: "presensi", label: "Presensi" },
  { key: "nilai", label: "Nilai" },
  { key: "diskusi", label: "Diskusi" },
  { key: "anggota", label: "Anggota" },
  { key: "pengaturan", label: "Pengaturan" },
];

/** Students never see Pengaturan — it holds KKM, weights and the Meet link. */
export function tabsFor(peran: PeranRuang) {
  return peran === "siswa" ? TABS.filter((tab) => tab.key !== "pengaturan") : TABS;
}

export function isTabKey(value: string | undefined): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

/** Guru and admin can change the room; students can only read it. */
export function bolehUbah(peran: PeranRuang): boolean {
  return peran === "guru" || peran === "admin";
}

// ---------------------------------------------------------------- formatting

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** `2026-10-12` → `12 Oktober 2026`. Read as a plain calendar date, no zone. */
export function formatTanggal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** `2026-10-12` → `12 Okt 2026`. */
export function formatTanggalPendek(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
}

/** 1 = Monday … 7 = Sunday, matching `jadwal.hari`. */
export function namaHari(hari: number): string {
  return HARI[hari % 7] ?? `Hari ${hari}`;
}

/** `2026-10-12` → `Senin`. */
export function hariDariTanggal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * `2026-11-04 23:59` → `4 Nov 2026 23.59`.
 *
 * Timestamps arrive from Postgres already shifted to Asia/Jakarta, so they are
 * split as strings — parsing them as dates would re-apply the server's zone.
 */
export function formatTanggalJam(nilai: string | null): string | null {
  if (!nilai) return null;
  const [tanggal, jam] = nilai.split(" ");
  return `${formatTanggalPendek(tanggal)} ${(jam ?? "").replace(":", ".")}`.trim();
}

/** `29 Okt 2026 07.00 – 21.00`, collapsing the date when both ends share it. */
export function formatJendela(
  mulai: string | null,
  selesai: string | null,
): string | null {
  if (!mulai || !selesai) return null;
  const [tglMulai] = mulai.split(" ");
  const [tglSelesai] = selesai.split(" ");
  const jamMulai = (mulai.split(" ")[1] ?? "").replace(":", ".");
  const jamSelesai = (selesai.split(" ")[1] ?? "").replace(":", ".");
  if (tglMulai === tglSelesai) {
    return `${formatTanggalPendek(tglMulai)} ${jamMulai} – ${jamSelesai}`;
  }
  return `${formatTanggalPendek(tglMulai)} ${jamMulai} – ${formatTanggalPendek(tglSelesai)} ${jamSelesai}`;
}

/** True when `iso` (YYYY-MM-DD) is today in the school's timezone. */
export function hariIni(iso: string, now = new Date()): boolean {
  const jakarta = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return iso.slice(0, 10) === jakarta;
}

// ------------------------------------------------------------------ presensi

export type StatusPresensi = "hadir" | "izin" | "sakit" | "alpa";

export const STATUS_PRESENSI: Record<
  StatusPresensi,
  { label: string; singkat: string; tone: "hijau" | "kuning" | "biru" | "merah" }
> = {
  hadir: { label: "Hadir", singkat: "H", tone: "hijau" },
  izin: { label: "Izin", singkat: "I", tone: "kuning" },
  sakit: { label: "Sakit", singkat: "S", tone: "biru" },
  alpa: { label: "Alpa", singkat: "A", tone: "merah" },
};

export type Badge = {
  label: string;
  tone: "netral" | "hijau" | "kuning" | "biru" | "merah" | "ungu";
};

/**
 * The attendance badge on a meeting card.
 *
 * A teacher sees the class tally; a student sees their own status, and while the
 * window is still open they see when it closes rather than a verdict they have
 * not earned yet. Both sides see the closing time while the window is open and
 * nothing has been recorded, because that is when the deadline still matters.
 */
export function badgePresensi(
  pertemuan: {
    terbit: boolean;
    presensiDibuka: boolean;
    presensiTutup: string | null;
    presensiAda: boolean;
    statusSiswa: StatusPresensi | null;
    hadir: number;
    jumlahSiswa: number;
  },
  peran: PeranRuang,
): Badge {
  if (peran === "siswa") {
    if (pertemuan.statusSiswa) {
      const status = STATUS_PRESENSI[pertemuan.statusSiswa];
      return { label: status.label, tone: status.tone };
    }
    if (pertemuan.presensiDibuka) {
      return {
        label: pertemuan.presensiTutup
          ? // Indonesian time notation in prose: 15.00, not 15:00.
            `Presensi dibuka s.d. ${pertemuan.presensiTutup.replace(":", ".")}`
          : "Presensi dibuka",
        tone: "kuning",
      };
    }
    return { label: "Tidak presensi", tone: "netral" };
  }

  // The teacher owns the window, so it is shown to them too: an open window with
  // nothing recorded yet is the exact moment a whole class can drift to Alpa.
  if (pertemuan.presensiDibuka && !pertemuan.presensiAda) {
    return {
      label: pertemuan.presensiTutup
        ? `Presensi dibuka s.d. ${pertemuan.presensiTutup.replace(":", ".")}`
        : "Presensi dibuka",
      tone: "kuning",
    };
  }

  if (!pertemuan.presensiAda) {
    return { label: "Presensi belum diisi", tone: "netral" };
  }
  return {
    label: `Hadir ${pertemuan.hadir}/${pertemuan.jumlahSiswa}`,
    tone: pertemuan.hadir === 0 ? "merah" : "hijau",
  };
}

// --------------------------------------------------------------------- nilai

export type KomponenNilai = {
  tugas: number | null;
  kuis: number | null;
  kehadiran: number | null;
};

/**
 * Final grade from the room's own weights.
 *
 * Returns null when a component has no data yet — averaging over an empty
 * component would quietly punish the whole class for a quiz that has not run.
 */
export function nilaiAkhir(
  komponen: KomponenNilai,
  bobot: { tugas: number; kuis: number; kehadiran: number },
): number | null {
  if (
    komponen.tugas === null ||
    komponen.kuis === null ||
    komponen.kehadiran === null
  ) {
    return null;
  }
  const total =
    (komponen.tugas * bobot.tugas +
      komponen.kuis * bobot.kuis +
      komponen.kehadiran * bobot.kehadiran) /
    100;
  return Math.round(total * 10) / 10;
}

export function predikat(nilai: number | null): string {
  if (nilai === null) return "—";
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  if (nilai >= 60) return "D";
  return "E";
}

// ------------------------------------------------------------------- sorting

/**
 * Compares names the way a person reads them: "X 2" comes before "X 10".
 *
 * Postgres sorts text byte-wise, which puts "X 10" right after "X 1", so any
 * list ordered by a class or subject name is re-sorted here instead.
 */
const urutAlami = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

export function bandingAlami(a: string | null, b: string | null): number {
  if (a === null || b === null) {
    if (a === b) return 0;
    return a === null ? 1 : -1;
  }
  return urutAlami.compare(a, b);
}

// --------------------------------------------------------------------- types

export type JadwalSlot = {
  id: number;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  linkMeet: string | null;
};

export type RuangHeader = {
  id: number;
  kelasId: number;
  kelasNama: string;
  mapelNama: string;
  mapelKode: string;
  guruId: string | null;
  guruNama: string | null;
  kkm: number;
  deskripsi: string | null;
  bobotTugas: number;
  bobotKuis: number;
  bobotKehadiran: number;
  taNama: string;
  taSemester: string;
  jumlahSiswa: number;
  jadwal: JadwalSlot[];
};

export type PertemuanRow = {
  id: number;
  urutan: number;
  judul: string;
  /** YYYY-MM-DD */
  tanggal: string;
  terbit: boolean;
  videoUrl: string | null;
  lampiranNama: string | null;
  lampiranUrl: string | null;
  /** Already formatted HH:MM for display. */
  presensiBuka: string | null;
  presensiTutup: string | null;
  /** Computed by the database, so no timezone arithmetic on the client. */
  presensiDibuka: boolean;
  presensiAda: boolean;
  hadir: number;
  tercatat: number;
  /** Students who ticked this meeting as learnt. */
  jumlahSelesai: number;
  /** Whether *this* student ticked it — always false for a teacher. */
  selesai: boolean;
  statusSiswa: StatusPresensi | null;
};

export type TugasRow = {
  id: number;
  judul: string;
  tipe: "file" | "teks" | "keduanya";
  terbit: boolean;
  bolehTerlambat: boolean;
  /** Formatted `4 Nov 2026 23.59`, or null when there is no deadline. */
  tenggat: string | null;
  terkumpul: number;
  dinilai: number;
  /** Set for a student: their own submission, if any. */
  pengumpulanSiswa: {
    dikumpulkan: boolean;
    nilai: number | null;
    terlambat: boolean;
  } | null;
};

export type KuisRow = {
  id: number;
  judul: string;
  terbit: boolean;
  durasiMenit: number;
  /** `YYYY-MM-DD HH24:MI` in Asia/Jakarta, formatted by `formatJendela`. */
  mulai: string | null;
  selesai: string | null;
  jumlahSoal: number;
  jumlahPercobaan: number;
  /** Computed by the database, so no clock arithmetic on the client. */
  dibuka: boolean;
  lewat: boolean;
  /** Set for a student: their own attempt, if any. */
  percobaanSiswa: { selesai: boolean; nilai: number | null } | null;
};

export type AnggotaRow = {
  id: string;
  nama: string;
  nisn: string | null;
  jk: "L" | "P" | null;
};

export type DiskusiRow = {
  id: number;
  isi: string;
  penulis: string;
  peran: string;
  /** ISO timestamp, formatted by the client-safe helper. */
  dibuat: string;
};

export type NilaiRow = {
  siswaId: string;
  nama: string;
  tugas: number | null;
  kuis: number | null;
  kehadiran: number | null;
};

export type PresensiMatriks = {
  pertemuan: { id: number; urutan: number; judul: string; tanggal: string }[];
  siswa: { id: string; nama: string }[];
  /** `status[siswaId][pertemuanId]` */
  status: Record<string, Record<string, StatusPresensi>>;
};

// --------------------------------------------------- presensi satu pertemuan

/** One meeting, for the teacher's attendance sheet. */
export type PertemuanDetail = {
  id: number;
  ruangId: number;
  urutan: number;
  judul: string;
  /** YYYY-MM-DD */
  tanggal: string;
  terbit: boolean;
  /**
   * The written material for the meeting — the only prose a meeting has.
   * Null or blank means the teacher has not written anything yet.
   */
  materi: string | null;
  videoUrl: string | null;
  lampiranNama: string | null;
  lampiranUrl: string | null;
  /** HH:MM in Asia/Jakarta, already formatted by the database. */
  presensiBuka: string | null;
  presensiTutup: string | null;
  presensiDibuka: boolean;
};

export type SiswaPresensi = {
  id: string;
  nama: string;
  nisn: string | null;
  /** null = nothing recorded yet. */
  status: StatusPresensi | null;
};

/**
 * One meeting as the student sitting in it sees it.
 *
 * Extends the teacher's view with the student's own standing: what was recorded
 * for them, who recorded it, and whether they have marked the material studied.
 * The class tally comes along because "21 dari 24 hadir" is the only context
 * that makes a single "Hadir" mean anything.
 */
export type PertemuanSiswa = PertemuanDetail & {
  statusSiswa: StatusPresensi | null;
  /** Null when nothing is recorded. Decides whether the student may still write. */
  sumberSiswa: SumberPresensi | null;
  selesai: boolean;
  hadir: number;
  jumlahSiswa: number;
  /** Neighbouring published meetings, so the page can be walked in order. */
  sebelumnya: { id: number; urutan: number; judul: string } | null;
  berikutnya: { id: number; urutan: number; judul: string } | null;
};

export type RingkasanPresensi = {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  belum: number;
  total: number;
};

/** Counts for the sheet's summary chips. */
export function ringkasPresensi(
  entri: { status: StatusPresensi | null }[],
): RingkasanPresensi {
  const hasil: RingkasanPresensi = {
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    belum: 0,
    total: entri.length,
  };
  for (const item of entri) {
    if (item.status === null) hasil.belum += 1;
    else hasil[item.status] += 1;
  }
  return hasil;
}

/**
 * The window line above the sheet.
 *
 * Times use the Indonesian dot (15.00), never a colon.
 */
export function keteranganJendela(pertemuan: {
  presensiBuka: string | null;
  presensiTutup: string | null;
  presensiDibuka: boolean;
}): string {
  const { presensiBuka, presensiTutup } = pertemuan;
  if (!presensiBuka || !presensiTutup) {
    return "Jendela presensi belum diatur untuk pertemuan ini.";
  }
  const buka = presensiBuka.replace(":", ".");
  const tutup = presensiTutup.replace(":", ".");
  return pertemuan.presensiDibuka
    ? `Presensi dibuka ${buka}–${tutup}, siswa masih bisa mengisi sampai ${tutup}.`
    : `Jendela presensi ${buka}–${tutup} sudah lewat.`;
}

/** Who wrote a student's attendance row. */
export type SumberPresensi = "guru" | "siswa";

/**
 * The window, said to the student who has to act on it.
 *
 * A closed window is not an error to apologise for: it is a fact, and the next
 * move (ask the teacher) belongs in the same sentence.
 */
export function keteranganJendelaSiswa(pertemuan: {
  presensiBuka: string | null;
  presensiTutup: string | null;
  presensiDibuka: boolean;
}): string {
  const { presensiBuka, presensiTutup } = pertemuan;
  if (!presensiBuka || !presensiTutup) {
    return "Guru belum mengatur jendela presensi untuk pertemuan ini.";
  }
  const buka = presensiBuka.replace(":", ".");
  const tutup = presensiTutup.replace(":", ".");
  return pertemuan.presensiDibuka
    ? `Presensi dibuka ${buka}–${tutup}. Isi sebelum ${tutup}.`
    : `Jendela presensi ${buka}–${tutup} sudah ditutup. Hubungi guru kalau Anda hadir.`;
}

/**
 * Whether a student may write their own attendance right now.
 *
 * Two rules carry the weight:
 *
 * - The window must be open. A student cannot backdate themselves into a
 *   meeting they skipped.
 * - A row the teacher wrote is final. Without this, a forgotten open window
 *   would let anyone quietly turn an "Alpa" into a "Hadir" — and attendance is
 *   exactly the number a school will be asked to defend.
 *
 * Shared by the button and the action, so a replayed POST cannot do what the
 * page would not have offered.
 */
export function bolehIsiSendiri(pertemuan: {
  terbit: boolean;
  presensiBuka: string | null;
  presensiTutup: string | null;
  presensiDibuka: boolean;
  sumberSiswa: SumberPresensi | null;
}): { ok: true } | { ok: false; alasan: string } {
  if (!pertemuan.terbit) {
    return { ok: false, alasan: "Pertemuan ini belum diterbitkan guru." };
  }
  // Checked before the window: when the teacher has already decided, "the
  // window is closed" is a distraction from the fact that matters.
  if (pertemuan.sumberSiswa === "guru") {
    return {
      ok: false,
      alasan:
        "Guru sudah mengisi presensi Anda untuk pertemuan ini. Hubungi guru kalau ada yang keliru.",
    };
  }
  if (!pertemuan.presensiBuka || !pertemuan.presensiTutup) {
    return {
      ok: false,
      alasan: "Guru belum membuka jendela presensi untuk pertemuan ini.",
    };
  }
  if (!pertemuan.presensiDibuka) {
    return {
      ok: false,
      alasan: `Jendela presensi ${pertemuan.presensiBuka.replace(":", ".")}–${pertemuan.presensiTutup.replace(":", ".")} sudah ditutup.`,
    };
  }
  return { ok: true };
}

/** "Diisi guru" / "Diisi sendiri" / "Belum diisi" — the provenance of a row. */
export function labelSumberPresensi(sumber: SumberPresensi | null): string {
  if (sumber === "guru") return "Diisi guru";
  if (sumber === "siswa") return "Diisi sendiri";
  return "Belum diisi";
}

// ----------------------------------------------------------------------- tugas

/** One task, for the submission sheet and the student's submit page. */
export type TugasDetail = {
  id: number;
  ruangId: number;
  judul: string;
  deskripsi: string | null;
  tipe: "file" | "teks" | "keduanya";
  terbit: boolean;
  bolehTerlambat: boolean;
  /** `YYYY-MM-DD HH24:MI` in Asia/Jakarta, or null. */
  tenggat: string | null;
  /** Computed by the database, so no clock arithmetic on the client. */
  lewatTenggat: boolean;
};

/** One row of the teacher's submission sheet: a student plus their answer. */
export type PengumpulanRow = {
  siswaId: string;
  nama: string;
  nisn: string | null;
  dikumpulkan: boolean;
  /** `28 Okt 2026 12.30`, or null. */
  dikumpulkanAt: string | null;
  teks: string | null;
  nilai: number | null;
  terlambat: boolean;
};

export type PengumpulanSiswa = {
  dikumpulkan: boolean;
  dikumpulkanAt: string | null;
  teks: string | null;
  nilai: number | null;
  terlambat: boolean;
};

/**
 * A student's standing on one task.
 *
 * "Dikumpulkan" means an answer actually arrived — not merely that a row exists.
 * A teacher may grade work handed in on paper, which stores a grade with no
 * answer; that is reported as "Tanpa jawaban" rather than pretending the student
 * submitted something online.
 */
export function statusPengumpulan(row: {
  dikumpulkan: boolean;
  terlambat: boolean;
  nilai: number | null;
}): Badge {
  if (!row.dikumpulkan) {
    return row.nilai === null
      ? { label: "Belum", tone: "netral" }
      : { label: "Tanpa jawaban", tone: "ungu" };
  }
  if (row.terlambat) return { label: "Terlambat", tone: "kuning" };
  return { label: "Sudah", tone: "hijau" };
}

/** How the task asks to be handed in — only text is accepted for now. */
export function labelTipe(tipe: "file" | "teks" | "keduanya"): string {
  return tipe === "file"
    ? "Hanya file"
    : tipe === "teks"
      ? "Hanya teks"
      : "File atau teks";
}

/** The deadline line, with the lateness rule spelled out. */
export function keteranganTenggat(tugas: {
  tenggat: string | null;
  lewatTenggat: boolean;
  bolehTerlambat: boolean;
}): string {
  if (!tugas.tenggat) return "Tanpa tenggat.";
  const teks = formatTanggalJam(tugas.tenggat) ?? tugas.tenggat;
  if (!tugas.lewatTenggat) return `Tenggat ${teks}.`;
  return tugas.bolehTerlambat
    ? `Tenggat ${teks} sudah lewat, keterlambatan masih diterima.`
    : `Tenggat ${teks} sudah lewat.`;
}

/**
 * Whether a student may (still) send an answer.
 *
 * Shared by the button state and the server action, so the rule cannot drift
 * between what the page offers and what the database accepts.
 */
export function bolehKirim(
  tugas: { terbit: boolean; bolehTerlambat: boolean; lewatTenggat: boolean },
  pengumpulan: { nilai: number | null } | null,
): { ok: true } | { ok: false; alasan: string } {
  if (!tugas.terbit) {
    return { ok: false, alasan: "Tugas ini belum diterbitkan guru." };
  }
  if (pengumpulan && pengumpulan.nilai !== null) {
    return {
      ok: false,
      alasan: "Tugas sudah dinilai. Hubungi guru kalau ingin memperbaiki.",
    };
  }
  if (tugas.lewatTenggat && !tugas.bolehTerlambat) {
    return { ok: false, alasan: "Tenggat sudah lewat, pengumpulan ditutup." };
  }
  return { ok: true };
}

// ----------------------------------------------------------------------- kuis

export type JenisSoal = "pg" | "esai";

/**
 * Reads a `pilihan` column into `{ A: "…", B: "…" }`.
 *
 * Two shapes exist in the database and both are legitimate history: the app
 * writes an object keyed by letter, while the old seed script wrote an array of
 * `{ teks, kunci }` (and left the answer marked on each option instead of in
 * `jawaban`). Rendering the array as a map puts a raw option object where React
 * expects a string, so every read goes through here.
 */
export function pilihanTersimpan(
  value: unknown,
): Record<string, string> {
  const hasil: Record<string, string> = {};

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const huruf = HURUF_OPSI[index];
      if (!huruf) return;
      if (item && typeof item === "object") {
        const entri = item as { teks?: unknown; kunci?: unknown };
        const teks = typeof entri.teks === "string" ? entri.teks.trim() : "";
        if (teks !== "") hasil[huruf] = teks;
        return;
      }
      if (typeof item === "string" && item.trim() !== "") hasil[huruf] = item.trim();
    });
    return hasil;
  }

  if (value && typeof value === "object") {
    for (const huruf of HURUF_OPSI) {
      const isi = (value as Record<string, unknown>)[huruf];
      if (typeof isi === "string" && isi.trim() !== "") hasil[huruf] = isi.trim();
    }
  }

  return hasil;
}

/**
 * The correct option key, wherever the old shape left it.
 *
 * A question stored before `jawaban` existed carries its key inside the option
 * array (`{ teks, kunci }`); without this the quiz would show no right answer
 * and score everyone zero.
 */
export function kunciTersimpan(
  pilihan: unknown,
  jawaban: string | null | undefined,
): string | null {
  if (jawaban && jawaban.trim() !== "") return jawaban.trim();
  if (!Array.isArray(pilihan)) return null;

  const daftar = pilihan as unknown[];
  for (let index = 0; index < daftar.length; index += 1) {
    const item = daftar[index];
    if (!item || typeof item !== "object") continue;
    const entri = item as { kunci?: unknown; teks?: unknown };
    if (typeof entri.kunci === "string" && entri.kunci.trim() !== "") {
      return entri.kunci.trim();
    }
    // `true` on the right option was the other convention worth honouring.
    if (entri.kunci === true) return HURUF_OPSI[index] ?? null;
  }
  return null;
}

export type SoalRow = {
  id: number;
  urutan: number;
  jenis: JenisSoal;
  pertanyaan: string;
  /** `{ A: "…", B: "…" }` — empty for an essay. */
  pilihan: Record<string, string>;
  /** The correct option key; null for an essay. */
  jawaban: string | null;
  /** Points this question contributes. */
  bobot: number;
  /** The bank question this was copied from, if any. */
  bankSoalId: number | null;
  /**
   * True when the bank has moved on since this copy was taken.
   *
   * Only meaningful for rows with a `bankSoalId`; it drives the "Sinkronkan"
   * button and is always false for a question written straight into the quiz.
   */
  bedaDariBank: boolean;
};

/** One quiz, as the editor and the student page both need it. */
export type KuisDetail = {
  id: number;
  ruangId: number;
  judul: string;
  petunjuk: string | null;
  /** `YYYY-MM-DD HH24:MI` in Asia/Jakarta, or null. */
  mulai: string | null;
  selesai: string | null;
  durasiMenit: number;
  acakSoal: boolean;
  acakOpsi: boolean;
  tampilkanNilai: boolean;
  terbit: boolean;
  jumlahSoal: number;
  /** Sum of `soal.bobot`, the denominator of the score. */
  totalBobot: number;
  jumlahEsai: number;
  /** Now is inside the window (or the quiz has no window at all). */
  dibuka: boolean;
  /** Now is past the closing time. */
  lewat: boolean;
};

export type KuisStatus = "draf" | "belum" | "dibuka" | "ditutup";

/**
 * The quiz's standing right now.
 *
 * A draft is invisible to students and stays out of the grade book; a published
 * quiz with no window is open immediately, because "no window" means "no
 * restriction", not "never".
 */
export function statusKuis(kuis: {
  terbit: boolean;
  dibuka: boolean;
  lewat: boolean;
}): KuisStatus {
  if (!kuis.terbit) return "draf";
  if (kuis.lewat) return "ditutup";
  return kuis.dibuka ? "dibuka" : "belum";
}

const STATUS_KUIS: Record<KuisStatus, { label: string; tone: Badge["tone"] }> = {
  draf: { label: "Draf", tone: "kuning" },
  belum: { label: "Belum dibuka", tone: "netral" },
  dibuka: { label: "Dibuka", tone: "hijau" },
  ditutup: { label: "Ditutup", tone: "netral" },
};

export function badgeKuis(kuis: {
  terbit: boolean;
  dibuka: boolean;
  lewat: boolean;
}): Badge {
  return STATUS_KUIS[statusKuis(kuis)];
}

/**
 * A student's own standing on a quiz, which is what they care about.
 *
 * An attempt that has been collected but still waits on an essay reads "Menunggu
 * koreksi" rather than showing a number the teacher has not confirmed.
 */
export function badgeKuisSiswa(
  kuis: { terbit: boolean; dibuka: boolean; lewat: boolean },
  percobaan: { selesai: boolean; nilai: number | null } | null,
): Badge {
  if (!percobaan) return badgeKuis(kuis);
  if (!percobaan.selesai) return { label: "Sedang dikerjakan", tone: "biru" };
  if (percobaan.nilai === null) return { label: "Menunggu koreksi", tone: "ungu" };
  return { label: `Nilai ${percobaan.nilai}`, tone: "hijau" };
}

/** The window line above a quiz, in Indonesian time notation. */
export function keteranganKuis(kuis: {
  mulai: string | null;
  selesai: string | null;
  durasiMenit: number;
  lewat: boolean;
}): string {
  const jendela = formatJendela(kuis.mulai, kuis.selesai);
  if (!jendela) {
    return `Tanpa jendela waktu · durasi ${kuis.durasiMenit} menit.`;
  }
  const ekor = kuis.lewat ? "sudah ditutup" : `durasi ${kuis.durasiMenit} menit`;
  return `${jendela} · ${ekor}.`;
}

/**
 * Whether a student may start (or resume) this quiz.
 *
 * Shared by the button and the server action, so a replayed POST cannot start a
 * quiz the page would not have offered.
 */
export function bolehKerjakan(
  kuis: { terbit: boolean; dibuka: boolean; lewat: boolean; jumlahSoal: number },
  percobaan: { selesai: boolean } | null,
): { ok: true } | { ok: false; alasan: string } {
  if (!kuis.terbit) return { ok: false, alasan: "Kuis ini belum diterbitkan guru." };
  if (kuis.jumlahSoal === 0) return { ok: false, alasan: "Kuis ini belum punya soal." };
  if (percobaan?.selesai) {
    return { ok: false, alasan: "Kuis sudah dikumpulkan." };
  }
  if (kuis.lewat) return { ok: false, alasan: "Waktu kuis sudah habis." };
  if (!kuis.dibuka) return { ok: false, alasan: "Kuis belum dibuka." };
  return { ok: true };
}

/**
 * `Σ perolehan / Σ bobot × 100`.
 *
 * Returns null while any essay is still uncorrected: a partial score would look
 * final in the grade book and quietly lock the student out of a real one.
 */
export function nilaiPercobaan(
  soal: Pick<SoalRow, "id" | "jenis" | "bobot" | "jawaban">[],
  jawaban: Record<string, string>,
  nilaiEsai: Record<string, number>,
): number | null {
  if (soal.length === 0) return null;

  let totalBobot = 0;
  let perolehan = 0;

  for (const butir of soal) {
    totalBobot += butir.bobot;
    if (butir.jenis === "esai") {
      const skor = nilaiEsai[String(butir.id)];
      if (skor === undefined || skor === null) return null;
      perolehan += Math.max(0, Math.min(butir.bobot, skor));
      continue;
    }
    const dipilih = jawaban[String(butir.id)];
    if (dipilih && butir.jawaban && dipilih === butir.jawaban) {
      perolehan += butir.bobot;
    }
  }

  if (totalBobot === 0) return null;
  return Math.round((perolehan / totalBobot) * 1000) / 10;
}

/** One row of the teacher's results table. */
export type PercobaanRow = {
  siswaId: string;
  nama: string;
  nisn: string | null;
  /** False when the student never opened the quiz. */
  ada: boolean;
  selesai: boolean;
  /** `28 Okt 2026 13.28`, or null. */
  mulai: string | null;
  dikumpulkan: string | null;
  nilai: number | null;
  /** Essay answers still waiting for a score. */
  perluKoreksi: number;
};

export function statusPercobaan(row: {
  ada: boolean;
  selesai: boolean;
  perluKoreksi: number;
}): Badge {
  if (!row.ada) return { label: "Belum", tone: "netral" };
  if (!row.selesai) return { label: "Mengerjakan", tone: "biru" };
  if (row.perluKoreksi > 0) return { label: "Perlu koreksi", tone: "ungu" };
  return { label: "Selesai", tone: "hijau" };
}

/** Per-question tally for the item analysis panel. */
export type ButirAnalisis = {
  soalId: number;
  urutan: number;
  pertanyaan: string;
  jenis: JenisSoal;
  /** Students who answered correctly, out of those who answered. */
  benar: number;
  menjawab: number;
  persenBenar: number;
  /** How many picked each option — empty for an essay. */
  sebaran: { opsi: string; jumlah: number }[];
};

export function analisisButir(
  soal: Pick<SoalRow, "id" | "urutan" | "pertanyaan" | "jenis" | "pilihan" | "jawaban">[],
  percobaan: { jawaban: Record<string, string> }[],
): ButirAnalisis[] {
  return soal.map((butir) => {
    const kunci = String(butir.id);
    let benar = 0;
    let menjawab = 0;
    const hitung: Record<string, number> = {};

    for (const cobaan of percobaan) {
      const dipilih = cobaan.jawaban?.[kunci];
      if (!dipilih) continue;
      menjawab += 1;
      hitung[dipilih] = (hitung[dipilih] ?? 0) + 1;
      if (butir.jenis === "pg" && dipilih === butir.jawaban) benar += 1;
    }

    return {
      soalId: butir.id,
      urutan: butir.urutan,
      pertanyaan: butir.pertanyaan,
      jenis: butir.jenis,
      benar,
      menjawab,
      persenBenar: menjawab === 0 ? 0 : Math.round((benar / menjawab) * 100),
      sebaran: Object.keys(butir.pilihan ?? {})
        .sort()
        .map((opsi) => ({ opsi, jumlah: hitung[opsi] ?? 0 })),
    };
  });
}

/** A question read out of the import textarea. */
export type SoalImpor = {
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  jenis: JenisSoal;
  bobot: number;
};

const HURUF_OPSI = ["A", "B", "C", "D", "E"] as const;

/**
 * Reads the bulk-import format:
 *
 *   1. Pertanyaan
 *   A. Opsi
 *   B. Opsi
 *   Kunci: B
 *
 * A block with no options becomes an essay worth 5 points; a multiple-choice
 * block is worth 1. Either default can be overridden per block with a
 * `Bobot: 3` line. Anything it cannot make sense of comes back in `galat` so
 * the teacher sees which block was skipped instead of losing it silently.
 */
export function parseSoalTeks(teks: string): { soal: SoalImpor[]; galat: string[] } {
  const soal: SoalImpor[] = [];
  const galat: string[] = [];

  type Mentah = {
    nomor: string;
    pertanyaan: string[];
    pilihan: Record<string, string>;
    kunci: string | null;
    bobot: number | null;
  };

  const blok: Mentah[] = [];
  let aktif: Mentah | null = null;
  let opsiTerakhir: string | null = null;

  for (const barisAsli of teks.split(/\r?\n/)) {
    const baris = barisAsli.trim();
    if (!baris) {
      opsiTerakhir = null;
      continue;
    }

    const mulaiSoal = baris.match(/^(\d+)\s*[.)]\s*(.*)$/);
    if (mulaiSoal) {
      aktif = {
        nomor: mulaiSoal[1],
        pertanyaan: [mulaiSoal[2].trim()],
        pilihan: {},
        kunci: null,
        bobot: null,
      };
      blok.push(aktif);
      opsiTerakhir = null;
      continue;
    }

    if (!aktif) {
      // Text before the first numbered line is not a question; keep it visible
      // rather than pretending it was imported.
      galat.push(`Baris di luar soal mana pun: "${baris.slice(0, 40)}"`);
      continue;
    }

    const kunci = baris.match(/^(?:kunci|jawaban)\s*[:.]\s*([A-Ea-e])\s*$/i);
    if (kunci) {
      aktif.kunci = kunci[1].toUpperCase();
      opsiTerakhir = null;
      continue;
    }

    // Optional per-block weight, so importing a mixed file does not flatten
    // every question to the same mark.
    const bobot = baris.match(/^bobot\s*[:.]\s*(\d{1,3})\s*$/i);
    if (bobot) {
      const nilai = Number(bobot[1]);
      if (nilai >= 1 && nilai <= 100) aktif.bobot = nilai;
      opsiTerakhir = null;
      continue;
    }

    const opsi = baris.match(/^([A-Ea-e])\s*[.)]\s*(.+)$/);
    if (opsi) {
      const huruf = opsi[1].toUpperCase();
      aktif.pilihan[huruf] = opsi[2].trim();
      opsiTerakhir = huruf;
      continue;
    }

    // A plain line continues the question, or the option it sits under.
    if (opsiTerakhir) {
      aktif.pilihan[opsiTerakhir] = `${aktif.pilihan[opsiTerakhir]} ${baris}`.trim();
    } else {
      aktif.pertanyaan.push(baris);
    }
  }

  for (const item of blok) {
    const pertanyaan = item.pertanyaan.join(" ").trim();
    if (!pertanyaan) {
      galat.push(`Soal nomor ${item.nomor} tidak punya pertanyaan.`);
      continue;
    }

    const huruf = Object.keys(item.pilihan).sort();
    if (huruf.length === 0) {
      soal.push({
        pertanyaan,
        pilihan: {},
        jawaban: null,
        jenis: "esai",
        bobot: item.bobot ?? 5,
      });
      continue;
    }

    if (!item.kunci) {
      galat.push(`Soal nomor ${item.nomor} tidak punya baris "Kunci:".`);
      continue;
    }
    if (!item.pilihan[item.kunci]) {
      galat.push(`Soal nomor ${item.nomor} berkunci ${item.kunci}, tetapi opsi itu tidak ada.`);
      continue;
    }

    soal.push({
      pertanyaan,
      pilihan: item.pilihan,
      jawaban: item.kunci,
      jenis: "pg",
      bobot: item.bobot ?? 1,
    });
  }

  return { soal, galat };
}

export const HURUF = HURUF_OPSI;

/** "Pilihan ganda" / "Esai" — used on chips and in the editor. */
export function labelJenisSoal(jenis: JenisSoal): string {
  return jenis === "esai" ? "Esai" : "Pilihan ganda";
}

/**
 * Whether a quiz is worth publishing.
 *
 * Publishing a one-question quiz is legal but it decides 40% of the final grade,
 * so the editor says so out loud instead of blocking the teacher.
 */
export function saranTerbit(kuis: {
  jumlahSoal: number;
  totalBobot: number;
  jumlahEsai: number;
}): string[] {
  const pesan: string[] = [];
  if (kuis.jumlahSoal === 0) {
    pesan.push("Belum ada soal, kuis tidak bisa diterbitkan.");
  } else if (kuis.jumlahSoal === 1) {
    pesan.push("Baru satu soal — komponen kuis hanya akan bernilai 0 atau 100.");
  }
  if (kuis.totalBobot > 0 && kuis.jumlahEsai > 0 && kuis.totalBobot <= kuis.jumlahEsai * 5) {
    pesan.push("Bobot esai jauh lebih besar daripada pilihan ganda; periksa ulang.");
  }
  return pesan;
}
