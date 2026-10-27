"use server";

import { revalidatePath } from "next/cache";

import {
  getBoard,
  getTahunAktif,
  hapusJadwal,
  hapusRuang,
  jamValid,
  simpanRuang,
  tambahJadwal,
  type Board,
} from "@/lib/pembagian";
import { requireRole } from "@/lib/session";

export type BoardResult = { error: string | null; board?: Board | null };

const LIST_PATH = "/admin/ruang";

function id(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Re-reads the board so the client never has to guess what changed. */
async function boardFor(kelasId: number): Promise<Board | null> {
  const ta = await getTahunAktif();
  if (!ta) return null;
  return getBoard(kelasId, ta.id);
}

/**
 * Server Action: the whole board for one class.
 *
 * Every mutation below returns this, so the screen shows exactly what the
 * database holds instead of patching its own copy.
 */
export async function fetchBoardAction(kelasId: number): Promise<Board | null> {
  await requireRole("admin");
  const idKelas = id(kelasId);
  if (!idKelas) return null;
  return boardFor(idKelas);
}

/**
 * Server Action: add a subject to the class, or move its teacher.
 *
 * One operation because a room is identified by (year, class, subject) — the
 * upsert either creates the row or rewrites its `guru_id`.
 */
export async function simpanRuangAction(input: {
  kelasId: number;
  mapelId: number;
  guruId: string | null;
}): Promise<BoardResult> {
  await requireRole("admin");

  const kelasId = id(input.kelasId);
  const mapelId = id(input.mapelId);
  const guruId = typeof input.guruId === "string" && input.guruId ? input.guruId : null;

  if (!kelasId) return { error: "Kelas tidak ditemukan." };
  if (!mapelId) return { error: "Mapel tidak ditemukan." };

  const ta = await getTahunAktif();
  if (!ta) return { error: "Belum ada tahun ajaran aktif." };

  const hasil = await simpanRuang({ taId: ta.id, kelasId, mapelId, guruId });
  if (!hasil.ok) return { error: hasil.error };

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/kelas");
  revalidatePath("/admin/mapel");
  return { error: null, board: await boardFor(kelasId) };
}

/** Server Action: one weekly slot, refused if it overlaps another in the class. */
export async function tambahJadwalAction(input: {
  kelasId: number;
  ruangId: number;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  linkMeet: string | null;
}): Promise<BoardResult> {
  await requireRole("admin");

  const kelasId = id(input.kelasId);
  const ruangId = id(input.ruangId);
  if (!kelasId) return { error: "Kelas tidak ditemukan." };
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const hari = Number(input.hari);
  if (!Number.isInteger(hari) || hari < 1 || hari > 6) {
    return { error: "Hari harus antara Senin dan Sabtu." };
  }

  const jamMulai = String(input.jamMulai ?? "").trim();
  const jamSelesai = String(input.jamSelesai ?? "").trim();
  if (!jamValid(jamMulai) || !jamValid(jamSelesai)) {
    return { error: "Jam harus diisi dalam format HH:MM." };
  }
  if (jamSelesai <= jamMulai) {
    return { error: "Jam selesai harus setelah jam mulai." };
  }

  const linkRaw = String(input.linkMeet ?? "").trim();
  let linkMeet: string | null = null;
  if (linkRaw) {
    let url: URL;
    try {
      url = new URL(linkRaw);
    } catch {
      return { error: "Link Meet harus berupa URL lengkap, mis. https://meet.google.com/…" };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Link Meet harus diawali http:// atau https://." };
    }
    linkMeet = linkRaw;
  }

  const ta = await getTahunAktif();
  if (!ta) return { error: "Belum ada tahun ajaran aktif." };

  const hasil = await tambahJadwal({
    taId: ta.id,
    kelasId,
    ruangId,
    hari,
    jamMulai,
    jamSelesai,
    linkMeet,
  });
  if (!hasil.ok) return { error: hasil.error };

  revalidatePath(LIST_PATH);
  return { error: null, board: await boardFor(kelasId) };
}

/** Server Action: remove one slot. */
export async function hapusJadwalAction(input: {
  kelasId: number;
  jadwalId: number;
}): Promise<BoardResult> {
  await requireRole("admin");

  const kelasId = id(input.kelasId);
  const jadwalId = id(input.jadwalId);
  if (!kelasId) return { error: "Kelas tidak ditemukan." };
  if (!jadwalId) return { error: "Jadwal tidak ditemukan." };

  await hapusJadwal(jadwalId);
  revalidatePath(LIST_PATH);
  return { error: null, board: await boardFor(kelasId) };
}

/** Server Action: remove the room itself — refused once it has content. */
export async function hapusRuangAction(input: {
  kelasId: number;
  ruangId: number;
}): Promise<BoardResult> {
  await requireRole("admin");

  const kelasId = id(input.kelasId);
  const ruangId = id(input.ruangId);
  if (!kelasId) return { error: "Kelas tidak ditemukan." };
  if (!ruangId) return { error: "Ruang belajar tidak ditemukan." };

  const hasil = await hapusRuang(ruangId);
  if (!hasil.ok) return { error: hasil.error };

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/kelas");
  revalidatePath("/admin/mapel");
  return { error: null, board: await boardFor(kelasId) };
}
