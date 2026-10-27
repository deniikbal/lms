import { pool } from "@/lib/db";

export * from "@/lib/tahun-ajaran-shared";

/** Fetch all tahun ajaran rows for display/editing. */
export async function listTahunAjaran() {
  const { rows } = await pool.query<{ 
    id: number; 
    nama: string; 
    semester: string; 
    aktif: boolean; 
    created_at: string; 
    updated_at: string; 
  }>(
    `select id, nama, semester, aktif, created_at, updated_at
       from tahun_ajaran
      order by aktif desc nulls last, nama asc`,
  );
  return rows;
}

/** Create a new tahun ajaran. */
export async function createTahunAjaran({
  nama,
  semester,
  aktif,
}: {
  nama: string;
  semester: string;
  aktif: boolean;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `insert into tahun_ajaran (nama, semester, aktif)
         values ($1, $2, $3)
      returning id`,
    [nama, semester, aktif],
  );
  return rows[0].id;
}

/** Update a tahun ajaran. */
export async function updateTahunAjaran(
  id: number,
  input: {
    nama: string;
    semester: string;
    aktif: boolean;
  },
) {
  await pool.query(
    `update tahun_ajaran
        set nama = $2,
            semester = $3,
            aktif = $4,
            updated_at = now()
      where id = $1`,
    [id, input.nama, input.semester, input.aktif],
  );
}

/** Delete a tahun ajaran. */
export async function deleteTahunAjaran(id: number) {
  await pool.query(`delete from tahun_ajaran where id = $1`, [id]);
}

/** Get tahun ajaran rows for dropdowns. */
export async function listTahunAjaranOptions() {
  const { rows } = await pool.query<{ id: number; nama: string }>(
    `select id, nama
       from tahun_ajaran
      order by aktif desc nulls last, nama asc`,
  );
  return rows;
}