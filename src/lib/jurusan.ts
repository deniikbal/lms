import { pool } from "@/lib/db";
import {
  JURUSAN_PER_PAGE,
  type JurusanRow,
  type JurusanStats,
  type ListJurusanResult,
} from "@/lib/jurusan-shared";

// Server-side consumers import everything from this module; the pure pieces
// live in `jurusan-shared` so Client Components can use them without pulling
// `pg` into the browser bundle.
export * from "@/lib/jurusan-shared";

type RawJurusanRow = {
  id: number;
  kode: string;
  nama: string;
  kelas_count: number;
};

function toJurusan(row: RawJurusanRow): JurusanRow {
  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kelasCount: row.kelas_count,
  };
}

/**
 * `withCount('kelas')` in the original app. Accurate without a year filter
 * because a class is not tied to an academic year — one row, one class, forever.
 */
const JURUSAN_SELECT = `
  select j.id,
         j.kode,
         j.nama,
         (select count(*)::int from kelas k where k.jurusan_id = j.id) as kelas_count
    from jurusan j
`;

/** Ordered by code — short, stable, and what admins scan for. */
const JURUSAN_ORDER = `order by j.kode asc`;

export async function listJurusanPage({
  q,
  page = 1,
  perPage = JURUSAN_PER_PAGE,
}: {
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<ListJurusanResult> {
  const term = q?.trim();
  const params: unknown[] = [];
  let where = "";

  if (term) {
    params.push(`%${term}%`);
    where = `where j.kode ilike $1 or j.nama ilike $1`;
  }

  const { rows: countRows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from jurusan j ${where}`,
    params,
  );

  const total = Number(countRows[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const offset = (safePage - 1) * perPage;

  const { rows } = await pool.query<RawJurusanRow>(
    `${JURUSAN_SELECT}
       ${where}
       ${JURUSAN_ORDER}
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, offset],
  );

  return { rows: rows.map(toJurusan), total, page: safePage, pageCount };
}

/** Headline numbers for the major screen's stat strip. */
export async function summariseJurusan(): Promise<JurusanStats> {
  const { rows } = await pool.query<{
    total: number;
    kelas: number;
    tanpa_jurusan: number;
  }>(`
    select (select count(*)::int from jurusan) as total,
           (select count(*)::int from kelas where jurusan_id is not null) as kelas,
           (select count(*)::int from kelas where jurusan_id is null) as tanpa_jurusan
  `);

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    kelas: row?.kelas ?? 0,
    tanpaJurusan: row?.tanpa_jurusan ?? 0,
  };
}

export async function getJurusan(id: number): Promise<JurusanRow | null> {
  const { rows } = await pool.query<RawJurusanRow>(
    `${JURUSAN_SELECT} where j.id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? toJurusan(row) : null;
}

/** Flat list for the class form's dropdown. */
export async function listJurusanOptions(): Promise<
  { id: number; kode: string; nama: string }[]
> {
  const { rows } = await pool.query<{ id: number; kode: string; nama: string }>(
    `select id, kode, nama from jurusan order by kode`,
  );
  return rows;
}

export type JurusanInput = {
  kode: string;
  nama: string;
};

export async function createJurusan(input: JurusanInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `insert into jurusan (kode, nama) values ($1, $2) returning id`,
    [input.kode, input.nama],
  );
  return rows[0].id;
}

export async function updateJurusan(
  id: number,
  input: JurusanInput,
): Promise<void> {
  await pool.query(
    `update jurusan
        set kode = $2,
            nama = $3,
            updated_at = now()
      where id = $1`,
    [id, input.kode, input.nama],
  );
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a major only when no class sits in it.
 *
 * The FK is `on delete set null`, so Postgres would happily orphan the classes
 * instead of complaining. That is exactly the silent outcome the blueprint
 * wants to avoid, hence the guard inside the DELETE — a class cannot slip in
 * between the check and the delete.
 */
export async function deleteJurusan(id: number): Promise<DeleteResult> {
  const deleted = await pool.query(
    `delete from jurusan j
      where j.id = $1
        and not exists (select 1 from kelas k where k.jurusan_id = j.id)`,
    [id],
  );

  if (deleted.rowCount === 1) return { ok: true };

  // Nothing was deleted: either the major is gone or classes still use it.
  const { rows } = await pool.query<{ kelas: number }>(
    `select count(*)::int as kelas from kelas where jurusan_id = $1`,
    [id],
  );

  if ((rows[0]?.kelas ?? 0) > 0) {
    return { ok: false, error: "Jurusan masih dipakai kelas." };
  }

  return { ok: false, error: "Jurusan tidak ditemukan." };
}
