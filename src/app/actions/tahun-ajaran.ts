"use server";

import { revalidatePath } from "next/cache";

import { listTahunAjaran, createTahunAjaran, updateTahunAjaran, deleteTahunAjaran } from "@/lib/tahun-ajaran";
import { requireRole } from "@/lib/session";

export type TahunAjaranFormState = {
  error: string | null;
  ok?: boolean;
};

export type TahunAjaranRow = {
  id: number;
  nama: string;
  semester: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type ListTahunAjaranResult = {
  rows: TahunAjaranRow[];
};

export async function listTahunAjaranAction(): Promise<ListTahunAjaranResult> {
  await requireRole("admin");
  const rows = await listTahunAjaran();
  return { rows };
}

export async function saveTahunAjaranAction(
  _prevState: TahunAjaranFormState,
  formData: FormData,
): Promise<TahunAjaranFormState> {
  await requireRole("admin");

  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const id = text("id") ? Number(text("id")) : null;
  const nama = text("nama");
  const semester = text("semester");
  const aktifRaw = text("aktif");
  const aktif = aktifRaw === "true" || aktifRaw === "on";

  if (!nama) return { error: "Nama tahun ajaran wajib diisi." };
  if (!semester) return { error: "Semester wajib dipilih." };
  if (!["Ganjil", "Genap"].includes(semester)) {
    return { error: "Pilih semester yang valid (Ganjil/Genap)." };
  }
  if (aktif !== true && aktif !== false) {
    return { error: "Status aktif tidak valid." };
  }

  try {
    if (id !== null && id > 0) {
      await updateTahunAjaran(id, { nama, semester, aktif });
    } else {
      await createTahunAjaran({ nama, semester, aktif });
    }
  } catch {
    return { error: "Gagal menyimpan data ke database." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/jurusan");
  revalidatePath("/admin/kelas");

  return { error: null, ok: true };
}

export async function deleteTahunAjaranAction(
  _prevState: { error: string | null; done?: boolean },
  formData: FormData,
): Promise<{ error: string | null; done?: boolean }> {
  await requireRole("admin");

  const id = Number(text(formData, "id"));
  if (!id || id <= 0) {
    return { error: "Tahun ajaran tidak ditemukan." };
  }

  try {
    await deleteTahunAjaran(id);
  } catch {
    return { error: "Gagal menghapus data dari database." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/jurusan");
  revalidatePath("/admin/kelas");

  return { error: null, done: true };
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}