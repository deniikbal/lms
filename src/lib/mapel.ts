import { pool } from "@/lib/db";
import {
  MAPEL_PER_PAGE,
  type Kelompok,
  type ListMapelResult,
  type MapelRow,
  type MapelStats,
} from "@/lib/mapel-shared";

// Server-side consumers import everything from this module; the pure pieces
// live in `mapel-shared` so Client Components can use them without pulling `pg`
// into the browser bundle.
export * from "@/lib/mapel-shared";

type RawMapelRow = {
  id: number;
  kode: string;
  nama: string;
  kelompok: Kelompok;
  dipakai: number;
};

function toMapel(row: RawMapelRow): MapelRow {
  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kelompok: row.kelompok,
    dipakai: row.dipakai,
  };
}

/**
 * "Dipakai" counts rooms, across every academic year — not only the active one.
 * A subject taught last year still has history attached to it, so it must not
 * look unused.
 */
const MAPEL_SELECT = `
  select m.id,
         m.kode,
         m.nama,
         m.kelompok,
         (select count(*)::int from ruang r where r.mapel_id = m.id) as dipakai
    from mapel m
`;

/** Grouped first (Umum → Kejuruan → Muatan Lokal), then by name. */
const MAPEL_ORDER = `
  order by case m.kelompok
             when 'Umum' then 0
             when 'Kejuruan' then 1
             when 'Muatan Lokal' then 2
             else 3
           end,
           m.nama asc
`;

export async function listMapelPage({
  q,
  page = 1,
  perPage = MAPEL_PER_PAGE,
}: {
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<ListMapelResult> {
  const term = q?.trim();
  const params: unknown[] = [];
  let where = "";

  if (term) {
    params.push(`%${term}%`);
    where = `where m.kode ilike $1
                or m.nama ilike $1
                or m.kelompok ilike $1`;
  }

  const { rows: countRows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from mapel m ${where}`,
    params,
  );

  const total = Number(countRows[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const offset = (safePage - 1) * perPage;

  const { rows } = await pool.query<RawMapelRow>(
    `${MAPEL_SELECT}
       ${where}
       ${MAPEL_ORDER}
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, offset],
  );

  return { rows: rows.map(toMapel), total, page: safePage, pageCount };
}

/** Headline numbers for the subject screen's stat strip. */
export async function summariseMapel(): Promise<MapelStats> {
  const { rows } = await pool.query<{
    total: number;
    umum: number;
    kejuruan: number;
    lokal: number;
    dipakai: number;
    ruang: number;
  }>(`
    select (select count(*)::int from mapel) as total,
           (select count(*)::int from mapel where kelompok = 'Umum') as umum,
           (select count(*)::int from mapel where kelompok = 'Kejuruan') as kejuruan,
           (select count(*)::int from mapel where kelompok = 'Muatan Lokal') as lokal,
           (select count(distinct mapel_id)::int from ruang where mapel_id is not null) as dipakai,
           (select count(*)::int from ruang) as ruang
  `);

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    umum: row?.umum ?? 0,
    kejuruan: row?.kejuruan ?? 0,
    lokal: row?.lokal ?? 0,
    dipakai: row?.dipakai ?? 0,
    ruang: row?.ruang ?? 0,
  };
}

export async function getMapel(id: number): Promise<MapelRow | null> {
  const { rows } = await pool.query<RawMapelRow>(
    `${MAPEL_SELECT} where m.id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? toMapel(row) : null;
}

export type MapelInput = {
  kode: string;
  nama: string;
  kelompok: Kelompok;
};

export async function createMapel(input: MapelInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `insert into mapel (kode, nama, kelompok)
     values ($1, $2, $3)
     returning id`,
    [input.kode, input.nama, input.kelompok],
  );
  return rows[0].id;
}

export async function updateMapel(id: number, input: MapelInput): Promise<void> {
  await pool.query(
    `update mapel
        set kode = $2,
            nama = $3,
            kelompok = $4,
            updated_at = now()
      where id = $1`,
    [id, input.kode, input.nama, input.kelompok],
  );
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a subject only when no room uses it.
 *
 * Same shape as the class guard: the check rides along in the DELETE, so a room
 * cannot be created between the test and the delete. The FK on
 * `ruang.mapel_id` is `on delete restrict` as a second line of defence — if a
 * room does exist, Postgres refuses too.
 */
export async function deleteMapel(id: number): Promise<DeleteResult> {
  const deleted = await pool.query(
    `delete from mapel m
      where m.id = $1
        and not exists (select 1 from ruang r where r.mapel_id = m.id)`,
    [id],
  );

  if (deleted.rowCount === 1) return { ok: true };

  // Nothing was deleted: either the subject is gone or rooms still use it.
  const { rows } = await pool.query<{ ruang: number }>(
    `select count(*)::int as ruang from ruang where mapel_id = $1`,
    [id],
  );

  if ((rows[0]?.ruang ?? 0) > 0) {
    return { ok: false, error: "Mapel masih dipakai di ruang belajar." };
  }

  return { ok: false, error: "Mapel tidak ditemukan." };
}
