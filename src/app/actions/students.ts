"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "better-auth/crypto";

import {
  deletePerson,
  deletePeopleBulk,
  getPerson,
  listPeople,
  resetPassword,
  updatePerson,
} from "@/lib/people";
import { SISWA_PER_PAGE, type ListPeopleResult } from "@/lib/people-shared";
import { requireRole } from "@/lib/session";

export type StudentFormState = { error: string | null };

const LIST_PATH = "/admin/siswa";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Server Action: one page of students for the client-side list.
 *
 * The list keeps its filters in component state rather than the URL, so the
 * table asks for pages through this action instead of a navigation. It is a
 * public endpoint like any other action, hence the role check.
 */
export async function fetchStudentsAction(input: {
  q: string;
  kelasId: number | null;
  page: number;
}): Promise<ListPeopleResult> {
  await requireRole("admin");

  const q = typeof input.q === "string" ? input.q : "";
  const kelasId =
    typeof input.kelasId === "number" && Number.isInteger(input.kelasId)
      ? input.kelasId
      : null;
  const page =
    typeof input.page === "number" && Number.isInteger(input.page) && input.page > 0
      ? input.page
      : 1;

  return listPeople({
    role: "siswa",
    q,
    kelasId,
    page,
    perPage: SISWA_PER_PAGE,
  });
}

/**
 * Server Action: update one student's profile.
 *
 * Server Actions are public endpoints, so the admin check happens here rather
 * than in the form that rendered it.
 */
export async function updateStudentAction(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireRole("admin");

  const id = text(formData, "id");
  const name = text(formData, "name");
  const username = text(formData, "username");
  const email = text(formData, "email");
  const jkRaw = text(formData, "jk");
  const kelasRaw = text(formData, "kelas_id");
  const aktif = formData.get("aktif") !== null;

  if (!id) {
    return { error: "Data siswa tidak ditemukan." };
  }
  if (name.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }
  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
    return { error: "NISN wajib 3–50 karakter (huruf, angka, titik, underscore)." };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (jkRaw && jkRaw !== "L" && jkRaw !== "P") {
    return { error: "Jenis kelamin harus L atau P." };
  }

  try {
    await updatePerson(id, "siswa", {
      name,
      username,
      email: email || null,
      jk: jkRaw === "L" || jkRaw === "P" ? jkRaw : null,
      kelasId: kelasRaw ? Number(kelasRaw) : null,
      aktif,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "username_taken") {
      return { error: "NISN ini sudah dipakai akun lain." };
    }
    throw error;
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { error: null };
}

/** Server Action: set the student's password back to their own NISN. */
export async function resetStudentPasswordAction(formData: FormData) {
  await requireRole("admin");

  const id = text(formData, "id");
  if (!id) return;

  const student = await getPerson(id, "siswa");
  if (!student?.username) return;

  await resetPassword(id, await hashPassword(student.username));

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
}

/** Server Action: delete a student and their credentials. */
export async function deleteStudentAction(formData: FormData) {
  await requireRole("admin");

  const id = text(formData, "id");
  if (!id) return;

  await deletePerson(id, "siswa");

  revalidatePath(LIST_PATH);
}

/** Server Action: bulk delete students. */
export async function deleteStudentsBulkAction(
  ids: string[],
): Promise<{ ok: boolean; count?: number; error?: string }> {
  await requireRole("admin");

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Pilih minimal satu siswa untuk dihapus." };
  }

  try {
    const count = await deletePeopleBulk(ids, "siswa");
    revalidatePath(LIST_PATH);
    return { ok: true, count };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus siswa.",
    };
  }
}
