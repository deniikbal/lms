/**
 * Single source of truth for roles in the LMS.
 *
 * Stored on `user.role` (a plain string column added through Better Auth's
 * `additionalFields`). Never trust this value from the client — always read it
 * from the session on the server (see `src/lib/session.ts`).
 */
export const ROLES = ["admin", "guru", "siswa"] as const;

export type Role = (typeof ROLES)[number];

/** Every self-registered account starts as a student. */
export const DEFAULT_ROLE: Role = "siswa";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  guru: "Guru",
  siswa: "Siswa",
};

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  guru: "/guru",
  siswa: "/siswa",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Coerce a raw database value into a role, falling back to the safest one. */
export function toRole(value: unknown): Role {
  return isRole(value) ? value : DEFAULT_ROLE;
}

export function homeForRole(role: Role): string {
  return ROLE_HOME[role];
}

/** Short description shown on the role cards. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Kelola akun, peran pengguna, dan konfigurasi sistem.",
  guru: "Kelola kelas, materi, dan penilaian siswa.",
  siswa: "Ikuti kelas, akses materi, dan lihat nilai.",
};
