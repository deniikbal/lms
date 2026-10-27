"use server";

import { revalidatePath } from "next/cache";

import {
  createJurusan,
  deleteJurusan,
  getJurusan,
  JURUSAN_PER_PAGE,
  KODE_MAX,
  listJurusanPage,
  NAMA_MAX,
  normaliseKode,
  summariseJurusan,
  updateJurusan,
} from "@/lib/jurusan";
import type { JurusanPageData } from "@/lib/jurusan-shared";
import { requireRole } from "@/lib/session";

export type JurusanFormState = { error: string | null; ok?: boolean };
export type JurusanDeleteState = { error: string | null; done?: boolean };

const LIST_PATH = "/admin/jurusan";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Server Action: one page of majors for the client-side list. */
export async function fetchJurusanAction(input: {
  q: string;
  page: number;
}): Promise<JurusanPageData> {
  await requireRole("admin");

  const q = typeof input.q === "string" ? input.q : "";
  const page =
    typeof input.page === "number" && Number.isInteger(input.page) && input.page > 0
      ? input.page
      : 1;

  const [data, stats] = await Promise.all([
    listJurusanPage({ q, page, perPage: JURUSAN_PER_PAGE }),
    summariseJurusan(),
  ]);

  return { ...data, stats };
}

/**
 * Server Action: create or update a major — one form serves both, `id` decides.
 *
 * `kode` is normalised to uppercase because it is an identity, not prose: the
 * unique index would otherwise store "tkj" next to "TKJ".
 */
export async function saveJurusanAction(
  _prevState: JurusanFormState,
  formData: FormData,
): Promise<JurusanFormState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = rawId ? Number(rawId) : null;
  const kode = normaliseKode(text(formData, "kode"));
  const nama = text(formData, "nama");

  if (!kode) return { error: "Kode jurusan wajib diisi." };
  if (kode.length > KODE_MAX) {
    return { error: `Kode jurusan maksimal ${KODE_MAX} karakter.` };
  }
  if (!/^[A-Z0-9]+$/.test(kode)) {
    return { error: "Kode jurusan hanya boleh huruf dan angka, tanpa spasi." };
  }
  if (!nama) return { error: "Nama jurusan wajib diisi." };
  if (nama.length > NAMA_MAX) {
    return { error: `Nama jurusan maksimal ${NAMA_MAX} karakter.` };
  }

  if (id !== null) {
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Jurusan tidak ditemukan." };
    }
    const current = await getJurusan(id);
    if (!current) return { error: "Jurusan tidak ditemukan." };
  }

  const input = { kode, nama };

  try {
    if (id === null) {
      await createJurusan(input);
    } else {
      await updateJurusan(id, input);
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { error: `Kode ${kode} sudah dipakai jurusan lain.` };
    }
    if (code === "23514") {
      return {
        error: `Kode 1–${KODE_MAX} karakter dan nama 1–${NAMA_MAX} karakter.`,
      };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  // The class screen shows the major's code in its own table and form.
  revalidatePath("/admin/kelas");
  return { error: null, ok: true };
}

/** Server Action: delete a major, refusing while a class still uses it. */
export async function deleteJurusanAction(
  _prevState: JurusanDeleteState,
  formData: FormData,
): Promise<JurusanDeleteState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return { error: "Jurusan tidak ditemukan." };
  }

  const result = await deleteJurusan(id);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/kelas");
  return { error: null, done: true };
}
