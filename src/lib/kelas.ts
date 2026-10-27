import { pool } from "@/lib/db";
import {
  isJenjang,
  KELAS_PER_PAGE,
  type Jenjang,
  type JurusanOption,
  type KelasRow,
  type KelasStats,
  type ListKelasResult,
  type WaliOption,
} from "@/lib/kelas-shared";

// Server-side consumers (pages, actions) import everything from this module; the
// pure pieces live in `kelas-shared` so Client Components can use them without
// pulling `pg` into the browser bundle.
export * from "@/lib/kelas-shared";

export async function getJenjang(): Promise<Jenjang> {
  const { rows } = await pool.query<{ nilai: string | null }>(
    `select nilai from pengaturan where kunci = 'jenjang'`,
  );
  const nilai = rows[0]?.nilai;
  // Fall back to SMK rather than throwing — a missing setting should not take
  // the whole page down.
  return isJenjang(nilai) ? nilai : "SMK";
}

type RawKelasRow = {
  id: number;
  nama: string;
  tingkat: number | null;
  jurusan_id: number | null;
  jurusan_kode: string | null;
  jurusan_nama: string | null;
  wali_id: string | null;
  wali_nama: string | null;
  siswa_count: number;
  ruang_count: number;
};

function toKelas(row: RawKelasRow): KelasRow {
  return {
    id: row.id,
    nama: row.nama,
    tingkat: row.tingkat,
    jurusanId: row.jurusan_id,
    jurusanKode: row.jurusan_kode,
    jurusanNama: row.jurusan_nama,
    waliId: row.wali_id,
    waliNama: row.wali_nama,
    siswaCount: row.siswa_count,
    ruangCount: row.ruang_count,
  };
}

const KELAS_SELECT = `
  select k.id,
         k.nama,
         k.tingkat,
         k.jurusan_id,
         j.kode as jurusan_kode,
         j.nama as jurusan_nama,
         k.wali_id,
         u.name as wali_nama,
         (select count(*)::int from "user" s
           where s.kelas_id = k.id and s.role = 'siswa') as siswa_count,
         (select count(*)::int from ruang r where r.kelas_id = k.id) as ruang_count
    from kelas k
    left join jurusan j on j.id = k.jurusan_id
    left join "user" u on u.id = k.wali_id
`;

/** One page of classes, ordered by tingkat then name — the order the table shows. */
export async function listKelasPage({
  q,
  page = 1,
  perPage = KELAS_PER_PAGE,
}: {
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<ListKelasResult> {
  const term = q?.trim();
  const params: unknown[] = [];
  let where = "";

  if (term) {
    params.push(`%${term}%`);
    where = `where k.nama ilike $1
                or coalesce(j.kode, '') ilike $1
                or coalesce(u.name, '') ilike $1`;
  }

  const { rows: countRows } = await pool.query<{ count: string }>(
    `select count(*)::text as count
       from kelas k
       left join jurusan j on j.id = k.jurusan_id
       left join "user" u on u.id = k.wali_id
       ${where}`,
    params,
  );

  const total = Number(countRows[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const offset = (safePage - 1) * perPage;

  const { rows } = await pool.query<RawKelasRow>(
    `${KELAS_SELECT}
       ${where}
      order by k.tingkat asc nulls last, k.nama asc
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, perPage, offset],
  );

  return { rows: rows.map(toKelas), total, page: safePage, pageCount };
}

/** Headline numbers for the class screen's stat strip. */
export async function summariseKelas(): Promise<KelasStats> {
  const { rows } = await pool.query<{
    total: number;
    siswa: number;
    tanpa_wali: number;
    ruang: number;
  }>(
    `select (select count(*)::int from kelas) as total,
            (select count(*)::int from "user"
              where role = 'siswa' and kelas_id is not null) as siswa,
            (select count(*)::int from kelas where wali_id is null) as tanpa_wali,
            (select count(*)::int from ruang) as ruang`,
  );

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    siswa: row?.siswa ?? 0,
    tanpaWali: row?.tanpa_wali ?? 0,
    ruang: row?.ruang ?? 0,
  };
}

export async function getKelas(id: number): Promise<KelasRow | null> {
  const { rows } = await pool.query<RawKelasRow>(
    `${KELAS_SELECT} where k.id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? toKelas(row) : null;
}

// The class form's major dropdown is the jurusan module's option list — one
// query, one owner. Re-exported under the name this module's callers already use.
export { listJurusanOptions as listJurusan } from "@/lib/jurusan";

/** Homeroom candidates — teachers only, never students. */
export async function listWali(): Promise<WaliOption[]> {
  const { rows } = await pool.query<WaliOption>(
    `select id, name, username as nip
       from "user"
      where role = 'guru' and aktif = true
      order by name`,
  );
  return rows;
}

export async function waliIsGuru(id: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(
    `select exists(select 1 from "user" where id = $1 and role = 'guru') as ok`,
    [id],
  );
  return rows[0]?.ok === true;
}

export type KelasInput = {
  nama: string;
  tingkat: number;
  jurusanId: number | null;
  waliId: string | null;
};

export async function createKelas(input: KelasInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `insert into kelas (nama, tingkat, jurusan_id, wali_id)
     values ($1, $2, $3, $4)
     returning id`,
    [input.nama, input.tingkat, input.jurusanId, input.waliId],
  );
  return rows[0].id;
}

export async function updateKelas(
  id: number,
  input: KelasInput,
): Promise<void> {
  await pool.query(
    `update kelas
        set nama = $2,
            tingkat = $3,
            jurusan_id = $4,
            wali_id = $5,
            updated_at = now()
      where id = $1`,
    [id, input.nama, input.tingkat, input.jurusanId, input.waliId],
  );
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a class only when it holds no students.
 *
 * The guard lives in the DELETE itself (`not exists`) rather than in a separate
 * SELECT, so a student cannot slip in between the check and the delete. Rooms
 * and announcements for the class go with it — both FKs are `on delete cascade`.
 */
export async function deleteKelas(id: number): Promise<DeleteResult> {
  const deleted = await pool.query(
    `delete from kelas k
      where k.id = $1
        and not exists (
          select 1 from "user" u
           where u.kelas_id = k.id and u.role = 'siswa'
        )`,
    [id],
  );

  if (deleted.rowCount === 1) return { ok: true };

  // Nothing was deleted: either the class is gone or it still has students.
  const { rows } = await pool.query<{ siswa: number }>(
    `select count(*)::int as siswa
       from "user" where kelas_id = $1 and role = 'siswa'`,
    [id],
  );

  if ((rows[0]?.siswa ?? 0) > 0) {
    return { ok: false, error: "Pindahkan siswa kelas ini terlebih dahulu." };
  }

  return { ok: false, error: "Kelas tidak ditemukan." };
}

export type BulkDeleteKelasResult = {
  ok: boolean;
  deletedCount: number;
  skippedClasses?: string[];
  error?: string;
};

export async function deleteKelasBulk(ids: number[]): Promise<BulkDeleteKelasResult> {
  if (ids.length === 0) return { ok: true, deletedCount: 0 };

  const { rows: occupiedRows } = await pool.query<{ id: number; nama: string; siswa: number }>(
    `select k.id, k.nama, count(u.id)::int as siswa
       from kelas k
       join "user" u on u.kelas_id = k.id and u.role = 'siswa'
      where k.id = any($1::int[])
      group by k.id, k.nama`,
    [ids],
  );

  const occupiedIds = new Set(occupiedRows.map((r) => r.id));
  const deletableIds = ids.filter((id) => !occupiedIds.has(id));

  let deletedCount = 0;
  if (deletableIds.length > 0) {
    const res = await pool.query(
      `delete from kelas where id = any($1::int[])`,
      [deletableIds],
    );
    deletedCount = res.rowCount ?? 0;
  }

  return {
    ok: true,
    deletedCount,
    skippedClasses: occupiedRows.map((r) => `${r.nama} (${r.siswa} siswa)`),
  };
}
