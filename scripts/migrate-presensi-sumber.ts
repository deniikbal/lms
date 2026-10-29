/**
 * Presensi — who wrote the row.
 *
 *   pnpm tsx scripts/migrate-presensi-sumber.ts
 *
 * Until now only the teacher could write attendance, so every row was
 * implicitly theirs. Students can now check themselves in during the window,
 * which raises a question the table could not answer: when a student clicks
 * "Saya hadir" on a meeting the teacher already marked "Alpa", whose word
 * stands?
 *
 * `sumber` answers it. A student may only write or replace a row they own; the
 * teacher's decision always wins. Existing rows default to 'guru' because that
 * is exactly who wrote them.
 *
 * Idempotent: safe to run again.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function kolom(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  tabel: string,
  nama: string,
  definisi: string,
) {
  await client.query(`
    do $$
    begin
      if not exists (
        select 1 from information_schema.columns
         where table_name = '${tabel}' and column_name = '${nama}'
      ) then
        alter table ${tabel} add column ${nama} ${definisi};
      end if;
    end $$;
  `);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // 'guru' is the honest default: before this column existed, nothing else
    // could have written the row.
    await kolom(client, "presensi", "sumber", "text not null default 'guru'");

    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'presensi_sumber_sah'
        ) then
          alter table presensi
            add constraint presensi_sumber_sah check (sumber in ('guru', 'siswa'));
        end if;
      end $$;
    `);

    await client.query("commit");

    const { rows } = await client.query<{ sumber: string; n: number }>(`
      select sumber, count(*)::int as n from presensi group by sumber order by sumber
    `);
    for (const row of rows) {
      console.log(`presensi ${row.sumber.padEnd(6)} ${row.n}`);
    }
    if (rows.length === 0) console.log("presensi kosong");
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
