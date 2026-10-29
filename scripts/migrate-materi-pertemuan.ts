/**
 * Pertemuan — isi materi.
 *
 *   pnpm tsx scripts/migrate-materi-pertemuan.ts
 *
 * A meeting could hold a title, a video link and one attachment, but no text.
 * That is enough for a teacher's checklist and not enough for a student: the
 * Materi tab led to a page with nothing to read, so "sudah dipelajari" had
 * nothing behind it.
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

    // Plain text, newlines preserved — the page renders it with `whitespace-pre-line`
    // rather than parsing Markdown, so what the teacher types is what the class reads.
    await kolom(client, "pertemuan", "materi", "text");

    await client.query("commit");

    const { rows } = await client.query<{ ada: number; kosong: number }>(`
      select count(*) filter (where materi is not null and btrim(materi) <> '')::int as ada,
             count(*) filter (where materi is null or btrim(materi) = '')::int as kosong
        from pertemuan
    `);
    console.log(`pertemuan dengan materi ${rows[0].ada}, tanpa materi ${rows[0].kosong}`);
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
