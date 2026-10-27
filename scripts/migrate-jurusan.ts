/**
 * Jurusan — schema tightening.
 *
 *   pnpm tsx scripts/migrate-jurusan.ts
 *
 * The table already exists (created by `migrate-kelas.ts` because `kelas`
 * references it). This adds the two bounds the blueprint puts on the fields.
 *
 * The FK `kelas.jurusan_id` is already `on delete set null`, which matches the
 * blueprint — the app intercepts the delete first, the FK is only the fallback.
 *
 * Idempotent: safe to run again.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

const KODE_MAX = 15;
const NAMA_MAX = 120;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      do $$
      begin
        if not exists (select 1 from pg_constraint where conname = 'jurusan_kode_length') then
          alter table jurusan add constraint jurusan_kode_length
            check (char_length(btrim(kode)) between 1 and ${KODE_MAX});
        end if;
        if not exists (select 1 from pg_constraint where conname = 'jurusan_nama_length') then
          alter table jurusan add constraint jurusan_nama_length
            check (char_length(btrim(nama)) between 1 and ${NAMA_MAX});
        end if;
      end
      $$;
    `);

    await client.query("commit");

    const { rows } = await client.query<{
      total: number;
      dipakai: number;
      panjang_kode: number;
      panjang_nama: number;
    }>(`
      select (select count(*)::int from jurusan) as total,
             (select count(distinct jurusan_id)::int from kelas where jurusan_id is not null) as dipakai,
             (select max(char_length(kode))::int from jurusan) as panjang_kode,
             (select max(char_length(nama))::int from jurusan) as panjang_nama
    `);
    const row = rows[0];
    console.log("jurusan :", row.total);
    console.log("dipakai :", row.dipakai);
    console.log(
      "max len :",
      `kode ${row.panjang_kode}/${KODE_MAX}`,
      `nama ${row.panjang_nama}/${NAMA_MAX}`,
    );
    console.log("done");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
