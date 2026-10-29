/**
 * Kuis — schema upgrades on top of `migrate-ruang-belajar.ts`.
 *
 *   pnpm tsx scripts/migrate-kuis.ts
 *
 * The three quiz tables already existed in a thinner form (title + window +
 * one question type + a bare attempt row). Building the full quiz needs:
 *
 *   kuis        petunjuk, acak_soal, acak_opsi, tampilkan_nilai
 *   soal        jenis (pg/esai); `skor` renamed to `bobot` so the wording
 *               matches the UI and the report
 *   percobaan   batas_at (per-student deadline), urutan_soal (the shuffled
 *               order frozen at start), jawaban, nilai_esai, and one attempt
 *               per student per quiz
 *
 * Nothing is dropped, so existing rows keep working. Idempotent: safe to run
 * again, and every step checks before it changes anything.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

/** Adds a column only when it is missing, so re-runs are silent. */
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

    // ---------------------------------------------------------------- kuis
    await kolom(client, "kuis", "petunjuk", "text");
    await kolom(client, "kuis", "acak_soal", "boolean not null default false");
    await kolom(client, "kuis", "acak_opsi", "boolean not null default false");
    await kolom(client, "kuis", "tampilkan_nilai", "boolean not null default true");

    // ---------------------------------------------------------------- soal
    await kolom(client, "soal", "jenis", "text not null default 'pg'");

    // `skor` was the original name; the quiz editor and the report both talk
    // about "bobot", so the column follows. Guarded because a re-run would
    // otherwise fail on the already-renamed table.
    await client.query(`
      do $$
      begin
        if exists (
          select 1 from information_schema.columns
           where table_name = 'soal' and column_name = 'skor'
        ) then
          alter table soal rename column skor to bobot;
        end if;
      end $$;
    `);

    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'soal_jenis_sah'
        ) then
          alter table soal
            add constraint soal_jenis_sah check (jenis in ('pg', 'esai'));
        end if;
      end $$;
    `);

    // ----------------------------------------------------------- percobaan
    await kolom(client, "percobaan", "batas_at", "timestamptz");
    await kolom(client, "percobaan", "urutan_soal", "jsonb");
    await kolom(client, "percobaan", "jawaban", "jsonb");
    await kolom(client, "percobaan", "nilai_esai", "jsonb");

    // A quiz score is Σ points / Σ weight × 100, which rarely lands on a whole
    // number (7 of 8 points is 87.5). The original column was an integer, so
    // storing such a score failed outright.
    await client.query(`
      do $$
      begin
        if exists (
          select 1 from information_schema.columns
           where table_name = 'percobaan' and column_name = 'nilai'
             and data_type = 'integer'
        ) then
          alter table percobaan alter column nilai type numeric(5,1);
        end if;
      end $$;
    `);

    // One attempt per student. The old table allowed duplicates, so any that
    // already exist are collapsed to the most recent before the index goes on.
    await client.query(`
      delete from percobaan p
       using percobaan q
       where p.kuis_id = q.kuis_id
         and p.siswa_id = q.siswa_id
         and p.id < q.id
    `);

    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'percobaan_unik'
        ) then
          alter table percobaan
            add constraint percobaan_unik unique (kuis_id, siswa_id);
        end if;
      end $$;
    `);

    // ---------------------------------------------------------------- indeks
    await client.query(`
      create index if not exists percobaan_siswa_idx on percobaan (siswa_id);
      create index if not exists soal_kuis_urutan_idx on soal (kuis_id, urutan);
    `);

    await client.query("commit");

    const { rows } = await client.query<Record<string, number>>(`
      select (select count(*)::int from kuis) as kuis,
             (select count(*)::int from soal) as soal,
             (select count(*)::int from percobaan) as percobaan
    `);
    const row = rows[0];
    for (const [table, n] of Object.entries(row)) {
      console.log(`${table.padEnd(12)} ${n}`);
    }
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
