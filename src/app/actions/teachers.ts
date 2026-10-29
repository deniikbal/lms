"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "better-auth/crypto";

import {
  createPerson,
  deletePeopleBulk,
  deletePerson,
  getPerson,
  listPeople,
  resetPassword,
  updatePerson,
} from "@/lib/people";
import { GURU_PER_PAGE, type ListPeopleResult } from "@/lib/people-shared";
import { requireRole } from "@/lib/session";

export type TeacherFormState = { error: string | null };

const LIST_PATH = "/admin/guru";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Server Action: one page of teachers for the client-side list.
 *
 * Same shape as the student equivalent — the list keeps its search term in
 * component state, so paging comes back through an action instead of a
 * navigation.
 */
export async function fetchTeachersAction(input: {
  q: string;
  page: number;
}): Promise<ListPeopleResult> {
  await requireRole("admin");

  const q = typeof input.q === "string" ? input.q : "";
  const page =
    typeof input.page === "number" && Number.isInteger(input.page) && input.page > 0
      ? input.page
      : 1;

  return listPeople({ role: "guru", q, page, perPage: GURU_PER_PAGE });
}

/** Server Action: create a teacher account with default password set to NIP. */
export async function createTeacherAction(
  _prevState: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await requireRole("admin");

  const name = text(formData, "name");
  const username = text(formData, "username");
  const email = text(formData, "email");
  const jkRaw = text(formData, "jk");
  const aktif = formData.get("aktif") !== null;

  if (name.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }
  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
    return { error: "NIP wajib 3–50 karakter (huruf, angka, titik, underscore)." };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (jkRaw && jkRaw !== "L" && jkRaw !== "P") {
    return { error: "Jenis kelamin harus L atau P." };
  }

  try {
    await createPerson("guru", {
      name,
      username,
      email: email || null,
      jk: jkRaw === "L" || jkRaw === "P" ? jkRaw : null,
      kelasId: null,
      aktif,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "username_taken") {
      return { error: "NIP ini sudah dipakai akun lain." };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  return { error: null };
}

/** Server Action: update one teacher's profile (kelas_id is forced to null). */
export async function updateTeacherAction(
  _prevState: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await requireRole("admin");

  const id = text(formData, "id");
  const name = text(formData, "name");
  const username = text(formData, "username");
  const email = text(formData, "email");
  const jkRaw = text(formData, "jk");
  const aktif = formData.get("aktif") !== null;

  if (!id) {
    return { error: "Data guru tidak ditemukan." };
  }
  if (name.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }
  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
    return { error: "NIP wajib 3–50 karakter (huruf, angka, titik, underscore)." };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (jkRaw && jkRaw !== "L" && jkRaw !== "P") {
    return { error: "Jenis kelamin harus L atau P." };
  }

  try {
    await updatePerson(id, "guru", {
      name,
      username,
      email: email || null,
      jk: jkRaw === "L" || jkRaw === "P" ? jkRaw : null,
      kelasId: null,
      aktif,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "username_taken") {
      return { error: "NIP ini sudah dipakai akun lain." };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  redirect(LIST_PATH);
}

/** Server Action: set the teacher's password back to their own NIP. */
export async function resetTeacherPasswordAction(formData: FormData) {
  await requireRole("admin");

  const id = text(formData, "id");
  if (!id) return;

  const teacher = await getPerson(id, "guru");
  if (!teacher?.username) return;

  await resetPassword(id, await hashPassword(teacher.username));

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
}

/** Server Action: delete a teacher and their credentials. */
export async function deleteTeacherAction(formData: FormData) {
  await requireRole("admin");

  const id = text(formData, "id");
  if (!id) return;

  await deletePerson(id, "guru");

  revalidatePath(LIST_PATH);
}

/** Server Action: bulk delete teachers. */
export async function deleteTeachersBulkAction(
  ids: string[],
): Promise<{ ok: boolean; count?: number; error?: string }> {
  await requireRole("admin");

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Pilih minimal satu guru untuk dihapus." };
  }

  try {
    const count = await deletePeopleBulk(ids, "guru");
    revalidatePath(LIST_PATH);
    revalidatePath("/admin/kelas");
    return { ok: true, count };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus guru.",
    };
  }
}
