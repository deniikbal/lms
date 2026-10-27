import { pool } from "@/lib/db";
import {
  PEOPLE_PER_PAGE,
  type KelasOption,
  type ListPeopleResult,
  type PeopleSummary,
  type PersonRow,
} from "@/lib/people-shared";
import type { Role } from "@/lib/roles";

// Server-side consumers import everything from this module; the pure pieces live
// in `people-shared` so Client Components can use them without pulling `pg` into
// the browser bundle.
export * from "@/lib/people-shared";

type RawPersonRow = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  jk: string | null;
  kelas_id: number | null;
  kelas_nama: string | null;
  wali_kelas: string | null;
  aktif: boolean;
  terakhir_aktif_at: Date | null;
};

function toPerson(row: RawPersonRow): PersonRow {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    jk: row.jk === "L" || row.jk === "P" ? row.jk : null,
    kelasId: row.kelas_id,
    kelasNama: row.kelas_nama,
    waliKelas: row.wali_kelas,
    aktif: row.aktif,
    terakhirAktifAt: row.terakhir_aktif_at,
  };
}

/**
 * Headline numbers for the list header. Deliberately unfiltered — they describe
 * the whole cohort, while `listPeople().total` answers "how many match?".
 */
export async function summarisePeople(role: Role): Promise<PeopleSummary> {
  const { rows } = await pool.query<{
    total: number;
    aktif: number;
    nonaktif: number;
    tanpa_kelas: number;
    wali_kelas: number;
  }>(
    `select count(*)::int as total,
            count(*) filter (where u.aktif)::int as aktif,
            count(*) filter (where not u.aktif)::int as nonaktif,
            count(*) filter (where u.kelas_id is null)::int as tanpa_kelas,
            count(*) filter (
              where exists (select 1 from kelas k where k.wali_id = u.id)
            )::int as wali_kelas
       from "user" u
      where u.role = $1`,
    [role],
  );

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    aktif: row?.aktif ?? 0,
    nonaktif: row?.nonaktif ?? 0,
    tanpaKelas: row?.tanpa_kelas ?? 0,
    waliKelas: row?.wali_kelas ?? 0,
  };
}

/**
 * One page of students or teachers.
 *
 * Both live in `user` and differ only by `role`, so the same query serves the
 * two screens — students additionally carry a class.
 */
export async function listPeople({
  role,
  q,
  kelasId,
  page = 1,
  perPage = PEOPLE_PER_PAGE,
}: {
  role: Role;
  q?: string;
  kelasId?: number | null;
  page?: number;
  perPage?: number;
}): Promise<ListPeopleResult> {
  const conditions = [`u.role = $1`];
  const params: unknown[] = [role];

  const term = q?.trim();
  if (term) {
    params.push(`%${term}%`);
    // NISN/NIP live in `username`; name search covers the rest.
    conditions.push(
      `(u.name ilike $${params.length} or coalesce(u.username, '') ilike $${params.length})`,
    );
  }

  if (kelasId) {
    params.push(kelasId);
    conditions.push(`u.kelas_id = $${params.length}`);
  }

  const where = `where ${conditions.join(" and ")}`;

  const { rows: countRows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from "user" u ${where}`,
    params,
  );

  const total = Number(countRows[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const offset = (safePage - 1) * perPage;

  const { rows } = await pool.query<RawPersonRow>(
    `select u.id,
            u.name,
            u.username,
            u.email,
            u.jk,
            u.kelas_id,
            k.nama as kelas_nama,
            (select string_agg(k2.nama, ', ' order by k2.nama)
               from kelas k2 where k2.wali_id = u.id) as wali_kelas,
            u.aktif,
            u.terakhir_aktif_at
       from "user" u
       left join kelas k on k.id = u.kelas_id
       ${where}
      order by u.name asc
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, offset],
  );

  return { rows: rows.map(toPerson), total, page: safePage, pageCount };
}

export async function getPerson(
  id: string,
  role: Role,
): Promise<PersonRow | null> {
  const { rows } = await pool.query<RawPersonRow>(
    `select u.id,
            u.name,
            u.username,
            u.email,
            u.jk,
            u.kelas_id,
            k.nama as kelas_nama,
            (select string_agg(k2.nama, ', ' order by k2.nama)
               from kelas k2 where k2.wali_id = u.id) as wali_kelas,
            u.aktif,
            u.terakhir_aktif_at
       from "user" u
       left join kelas k on k.id = u.kelas_id
      where u.id = $1 and u.role = $2`,
    [id, role],
  );

  const row = rows[0];
  return row ? toPerson(row) : null;
}

export async function listKelas(): Promise<KelasOption[]> {
  const { rows } = await pool.query<KelasOption>(
    `select id, nama from kelas order by tingkat nulls last, nama`,
  );
  return rows;
}

export type PersonInput = {
  name: string;
  username: string;
  email: string | null;
  jk: "L" | "P" | null;
  kelasId: number | null;
  aktif: boolean;
};

/** Throws `username_taken` when another account already uses the NISN/NIP. */
export async function updatePerson(
  id: string,
  role: Role,
  input: PersonInput,
): Promise<void> {
  try {
    await pool.query(
      `update "user"
          set name = $3,
              username = $4,
              "displayUsername" = $4,
              email = $5,
              jk = $6,
              kelas_id = $7,
              aktif = $8,
              "updatedAt" = now()
        where id = $1 and role = $2`,
      [
        id,
        role,
        input.name,
        input.username,
        input.email,
        input.jk,
        // A class only ever belongs to a student.
        role === "siswa" ? input.kelasId : null,
        input.aktif,
      ],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("username_taken");
    }
    throw error;
  }
}

/** Sets the password back to the person's own NISN/NIP. */
export async function resetPassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  const updated = await pool.query(
    `update account
        set password = $2, "updatedAt" = now()
      where "userId" = $1 and "providerId" = 'credential'`,
    [id, passwordHash],
  );

  if (updated.rowCount === 0) {
    await pool.query(
      `insert into account
         (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $2, $3, now(), now())`,
      [`acc-${id}`, id, passwordHash],
    );
  }
}

export async function deletePerson(id: string, role: Role): Promise<void> {
  // Sessions and credentials are owned by Better Auth, so clear them first.
  await pool.query(`delete from session where "userId" = $1`, [id]);
  await pool.query(`delete from account where "userId" = $1`, [id]);
  await pool.query(`delete from "user" where id = $1 and role = $2`, [id, role]);
}
