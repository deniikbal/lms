import { pool } from "@/lib/db";
import { toRole, type Role } from "@/lib/roles";

export type UserRow = {
  id: string;
  name: string;
  /** Null for students created without an email address. */
  email: string | null;
  role: Role;
  createdAt: Date;
};

type RawUserRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  createdAt: Date;
};

/** All accounts, newest first — used by the admin dashboard. */
export async function listUsers(): Promise<UserRow[]> {
  const { rows } = await pool.query<RawUserRow>(
    `select id, name, email, role, "createdAt"
       from "user"
      order by "createdAt" desc`,
  );

  return rows.map((row) => ({ ...row, role: toRole(row.role) }));
}

export async function countUsersByRole(): Promise<Record<Role, number>> {
  const { rows } = await pool.query<{ role: string | null; count: string }>(
    `select role, count(*)::text as count from "user" group by role`,
  );

  const counts: Record<Role, number> = { admin: 0, guru: 0, siswa: 0 };
  for (const row of rows) {
    counts[toRole(row.role)] += Number(row.count);
  }

  return counts;
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  await pool.query(`update "user" set role = $1 where id = $2`, [role, userId]);
}
