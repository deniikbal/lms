"use server";

import { revalidatePath } from "next/cache";

import {
  createMapel,
  deleteMapel,
  getMapel,
  isKelompok,
  KODE_MAX,
  MAPEL_PER_PAGE,
  listMapelPage,
  NAMA_MAX,
  normaliseKode,
  summariseMapel,
  updateMapel,
} from "@/lib/mapel";
import type { MapelPageData } from "@/lib/mapel-shared";
import { requireRole } from "@/lib/session";

export type MapelFormState = { error: string | null; ok?: boolean };
export type MapelDeleteState = { error: string | null; done?: boolean };

const LIST_PATH = "/admin/mapel";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Server Action: one page of subjects for the client-side list.
 *
 * Search and page live in component state, so paging comes back through an
 * action rather than a navigation.
 */
export async function fetchMapelAction(input: {
  q: string;
  page: number;
}): Promise<MapelPageData> {
  await requireRole("admin");

  const q = typeof input.q === "string" ? input.q : "";
  const page =
    typeof input.page === "number" && Number.isInteger(input.page) && input.page > 0
      ? input.page
      : 1;

  // Stats ride along so the strip stays correct after an add or delete without
  // a second round trip.
  const [data, stats] = await Promise.all([
    listMapelPage({ q, page, perPage: MAPEL_PER_PAGE }),
    summariseMapel(),
  ]);

  return { ...data, stats };
}

/**
 * Server Action: create or update a subject — one form serves both, `id`
 * decides.
 *
 * `kode` is normalised to uppercase because it is an identity, not prose: the
 * unique index would otherwise happily store "mtk" next to "MTK".
 */
export async function saveMapelAction(
  _prevState: MapelFormState,
  formData: FormData,
): Promise<MapelFormState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = rawId ? Number(rawId) : null;
  const kode = normaliseKode(text(formData, "kode"));
  const nama = text(formData, "nama");
  const kelompok = text(formData, "kelompok");

  if (!kode) return { error: "Kode mapel wajib diisi." };
  if (kode.length > KODE_MAX) {
    return { error: `Kode mapel maksimal ${KODE_MAX} karakter.` };
  }
  if (!/^[A-Z0-9]+$/.test(kode)) {
    return { error: "Kode mapel hanya boleh huruf dan angka, tanpa spasi." };
  }
  if (!nama) return { error: "Nama mapel wajib diisi." };
  if (nama.length > NAMA_MAX) {
    return { error: `Nama mapel maksimal ${NAMA_MAX} karakter.` };
  }
  if (!isKelompok(kelompok)) {
    return { error: "Kelompok mapel tidak dikenal." };
  }

  if (id !== null) {
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Mapel tidak ditemukan." };
    }
    const current = await getMapel(id);
    if (!current) return { error: "Mapel tidak ditemukan." };
  }

  const input = { kode, nama, kelompok };

  try {
    if (id === null) {
      await createMapel(input);
    } else {
      await updateMapel(id, input);
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { error: `Kode ${kode} sudah dipakai mapel lain.` };
    }
    if (code === "23514") {
      return {
        error: `Kode 1–${KODE_MAX} karakter dan nama 1–${NAMA_MAX} karakter.`,
      };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/kelas");
  // The dialog closes on `ok` — no redirect, the list refetches instead.
  return { error: null, ok: true };
}

/** Server Action: delete a subject, refusing while a room still uses it. */
export async function deleteMapelAction(
  _prevState: MapelDeleteState,
  formData: FormData,
): Promise<MapelDeleteState> {
  await requireRole("admin");

  const rawId = text(formData, "id");
  const id = Number(rawId);
  if (!rawId || !Number.isInteger(id) || id <= 0) {
    return { error: "Mapel tidak ditemukan." };
  }

  const result = await deleteMapel(id);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/admin/kelas");
  return { error: null, done: true };
}
