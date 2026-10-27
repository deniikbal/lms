"use server";

import { revalidatePath } from "next/cache";

import {
  createKelas,
  deleteKelas,
  deleteKelasBulk,
  getJenjang,
  getKelas,
  hasJurusan,
  KELAS_PER_PAGE,
  listJurusan,
  listKelasPage,
  NAMA_MAX,
  summariseKelas,
  tingkatOptions,
  updateKelas,
  waliIsGuru,
  type BulkDeleteKelasResult,
} from "@/lib/kelas";
import type { KelasPageData } from "@/lib/kelas-shared";
import { requireRole } from "@/lib/session";

export type KelasFormState = { error: string | null; ok?: boolean };
export type KelasDeleteState = { error: string | null; done?: boolean };

const LIST_PATH = "/admin/kelas";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Server Action: one page of classes for the client-side list.
 *
 * The class screen keeps its search term and page number in component state, so
 * paging comes back through an action rather than a navigation.
 */
export async function fetchKelasAction(input: {
  q: string;
  page: number;
}): Promise<KelasPageData> {
  await requireRole("admin");

  const q = typeof input.q === "string" ? input.q : "";
  const page =
    typeof input.page === "number" && Number.isInteger(input.page) && input.page > 0
      ? input.page
      : 1;

  // Stats ride along so the strip stays correct after an add or delete without
  // a second round trip.
  const [data, stats] = await Promise.all([
    listKelasPage({ q, page, perPage: KELAS_PER_PAGE }),
    summariseKelas(),
  ]);

  return { ...data, stats };
}

/**
 * Server Action: create or update a class — one form serves both, `id` decides.
 *
 * `tingkat` is bounded by the school's jenjang, except when an existing class
 * still carries an out-of-range value (legacy rows from before the setting
 * existed): re-saving it unchanged is allowed so the row can still be edited,
 * but a new out-of-range value is rejected.
 */
export async function saveKelasAction(
  _prevState: KelasFormState,
  formData: FormData,
): Promise<KelasFormState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = rawId ? Number(rawId) : null;
  const nama = text(formData, "nama");
  const tingkatRaw = text(formData, "tingkat");
  const jurusanRaw = text(formData, "jurusan_id");
  const waliId = text(formData, "wali_id");

  if (!nama) return { error: "Nama kelas wajib diisi." };
  if (nama.length > NAMA_MAX) {
    return { error: `Nama kelas maksimal ${NAMA_MAX} karakter.` };
  }
  if (!/^\d+$/.test(tingkatRaw)) {
    return { error: "Tingkat wajib dipilih." };
  }

  const tingkat = Number(tingkatRaw);
  const jenjang = await getJenjang();
  const allowed = tingkatOptions(jenjang);

  let current: Awaited<ReturnType<typeof getKelas>> = null;
  if (id !== null) {
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Kelas tidak ditemukan." };
    }
    current = await getKelas(id);
    if (!current) return { error: "Kelas tidak ditemukan." };
  }

  const legacyUnchanged = current?.tingkat === tingkat && !allowed.includes(tingkat);
  if (!allowed.includes(tingkat) && !legacyUnchanged) {
    return {
      error: `Tingkat untuk jenjang ${jenjang} hanya ${allowed[0]}–${allowed[allowed.length - 1]}.`,
    };
  }

  // A major only applies to SMA/SMK; ignore whatever the form sent otherwise.
  let jurusanId: number | null = null;
  if (hasJurusan(jenjang) && jurusanRaw) {
    const parsed = Number(jurusanRaw);
    const options = await listJurusan();
    if (!options.some((item) => item.id === parsed)) {
      return { error: "Jurusan tidak ditemukan." };
    }
    jurusanId = parsed;
  }

  // The homeroom teacher must be an active teacher, never a student.
  let wali: string | null = null;
  if (waliId) {
    if (!(await waliIsGuru(waliId))) {
      return { error: "Wali kelas harus dipilih dari daftar guru." };
    }
    wali = waliId;
  }

  const input = { nama, tingkat, jurusanId, waliId: wali };

  try {
    if (id === null) {
      await createKelas(input);
    } else {
      await updateKelas(id, input);
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { error: "Nama kelas itu sudah dipakai." };
    }
    if (code === "23514") {
      return { error: `Nama kelas 1–${NAMA_MAX} karakter dan tingkat 1–12.` };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/siswa");
  // The dialog closes on `ok` — no redirect, the list refetches instead.
  return { error: null, ok: true };
}

/** Server Action: delete a class, refusing while it still holds students. */
export async function deleteKelasAction(
  _prevState: KelasDeleteState,
  formData: FormData,
): Promise<KelasDeleteState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return { error: "Kelas tidak ditemukan." };
  }

  const result = await deleteKelas(id);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/siswa");
  return { error: null, done: true };
}

/** Server Action: bulk delete classes, skipping ones that still hold students. */
export async function deleteKelasBulkAction(
  ids: number[],
): Promise<BulkDeleteKelasResult> {
  await requireRole("admin");

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, deletedCount: 0, error: "Pilih minimal satu kelas." };
  }

  try {
    const result = await deleteKelasBulk(ids);
    revalidatePath(LIST_PATH);
    revalidatePath("/admin/siswa");
    return result;
  } catch (error) {
    return {
      ok: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Gagal menghapus kelas.",
    };
  }
}
