"use server";

import { revalidatePath } from "next/cache";

import { isRole } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { updateUserRole } from "@/lib/users";

/**
 * Server Action: change another user's role.
 *
 * Server Actions are public endpoints — the role check happens here, on the
 * server, not in the UI that rendered the form.
 */
export async function setUserRole(formData: FormData) {
  const admin = await requireRole("admin");

  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role");

  // Never let an admin demote themselves — it locks the last admin out.
  if (!userId || userId === admin.id || !isRole(role)) {
    return;
  }

  await updateUserRole(userId, role);
  revalidatePath("/admin");
}
