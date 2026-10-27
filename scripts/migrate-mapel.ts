/**
 * Mata Pelajaran — schema tightening.
 *
 *   pnpm tsx scripts/migrate-mapel.ts
 *
 * The table already exists (created by `migrate-kelas.ts` because `ruang` needs
 * it). This adds the two bounds the blueprint puts on the fields, and fixes a
 * delete rule that contradicted the product decision.
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

    // --- bounds -------------------------------------------------------------
    // Named, and guarded, so a second run does not stack duplicates.
    await client.query(`
      do $$
      begin
        if not exists (select 1 from pg_constraint where conname = 'mapel_kode_length') then
          alter table mapel add constraint mapel_kode_length
            check (char_length(btrim(kode)) between 1 and ${KODE_MAX});
        end if;
        if not exists (select 1 from pg_constraint where conname = 'mapel_nama_length') then
          alter table mapel add constraint mapel_nama_length
            check (char_length(btrim(nama)) between 1 and ${NAMA_MAX});
        end if;
      end
      $$;
    `);

    // --- ruang.mapel_id: cascade → restrict ---------------------------------
    // A mapel that is still taught somewhere must not be deletable. The action
    // refuses first, but the cascade made the *database* an accomplice: a stray
    // `delete from mapel` would have silently removed every room using it.
    const { rows: fks } = await client.query<{ conname: string; def: string }>(
      `select c.conname, pg_get_constraintdef(c.oid) as def
         from pg_constraint c
        where c.conrelid = 'ruang'::regclass
          and c.contype = 'f'
          and pg_get_constraintdef(c.oid) like '%mapel%'`,
    );

    for (const fk of fks) {
      if (fk.def.includes("ON DELETE RESTRICT")) continue;
      await client.query(`alter table ruang drop constraint "${fk.conname}"`);
      await client.query(
        `alter table ruang add constraint "${fk.conname}"
           foreign key (mapel_id) references mapel(id) on delete restrict`,
      );
      console.log(`  ${fk.conname}: ${fk.def} → on delete restrict`);
    }

    await client.query("commit");

    // --- report -------------------------------------------------------------
    const { rows } = await client.query<{
      total: number;
      kosong: number;
      panjang_kode: number;
      panjang_nama: number;
    }>(`
      select (select count(*)::int from mapel) as total,
             (select count(*)::int from mapel m
               where not exists (select 1 from ruang r where r.mapel_id = m.id)) as kosong,
             (select max(char_length(kode))::int from mapel) as panjang_kode,
             (select max(char_length(nama))::int from mapel) as panjang_nama
    `);
    const row = rows[0];
    console.log("mapel   :", row.total);
    console.log("terpakai:", row.total - row.kosong, "| tanpa ruang:", row.kosong);
    console.log("max len :", `kode ${row.panjang_kode}/${KODE_MAX}`, `nama ${row.panjang_nama}/${NAMA_MAX}`);
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
