/**
 * Topik bank soal — a topic becomes a thing you create, not a text you retype.
 *
 *   pnpm tsx scripts/migrate-topik-bank.ts
 *
 * Until now a topic was a bare `bank_soal.topik` string, so the bank had no
 * index of its own: it listed questions and *guessed* the topics by grouping
 * on that string. Two consequences hurt. An empty topic could not exist at all
 * (a topic with no questions has no rows, so it vanished), and the same topic
 * written with a different capital was silently a second topic.
 *
 * `topik_bank` makes the topic a row owned by (teacher, subject). Questions
 * still carry their subject and a `topik` label — `soal` in a quiz is keyed by
 * content, and `bank_soal.mapel_id` is what the quiz picker filters on — so
 * nothing downstream has to change. The table is the name; `bank_soal.topik`
 * stays the label, kept in step by the application.
 *
 * Backfill: every distinct (teacher, subject, topic) already in the bank gets a
 * row. Idempotent — the `not exists` means a re-run adds nothing.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // `urutan` sempat ada di draf pertama skema ini, tetapi urutan topik selalu
    // diturunkan dari nama mapel lalu nama topik — kolomnya tidak pernah dibaca.
    await client.query("alter table topik_bank drop column if exists urutan");

    await client.query(`
      create table if not exists topik_bank (
        id         serial primary key,
        guru_id    text not null references "user"(id) on delete cascade,
        mapel_id   integer references mapel(id) on delete set null,
        nama       text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint topik_bank_nama_length
          check (char_length(btrim(nama)) between 1 and 80)
      )
    `);

    // One topic per (teacher, subject, name). Case-folded so "Laju Reaksi" and
    // "laju reaksi" cannot both exist — that duplicate is exactly what this
    // table is meant to prevent.
    await client.query(`
      create unique index if not exists topik_bank_unik
        on topik_bank (guru_id, coalesce(mapel_id, 0), lower(btrim(nama)))
    `);

    await client.query(`
      create index if not exists topik_bank_pemilik_idx
        on topik_bank (guru_id, mapel_id)
    `);

    // -------------------------------------------------------------- backfill
    const { rows: dibuat } = await client.query<{ n: number }>(`
      with sumber as (
        select distinct b.guru_id, b.mapel_id, btrim(b.topik) as nama
          from bank_soal b
         where b.topik is not null and btrim(b.topik) <> ''
      ),
      baru as (
        insert into topik_bank (guru_id, mapel_id, nama)
        select s.guru_id, s.mapel_id, s.nama
          from sumber s
         where not exists (
           select 1 from topik_bank t
            where t.guru_id = s.guru_id
              and t.mapel_id is not distinct from s.mapel_id
              and lower(btrim(t.nama)) = lower(s.nama)
         )
        returning id
      )
      select count(*)::int as n from baru
    `);

    // Trailing/leading whitespace in the label would break the join by name.
    const { rowCount: dirapikan } = await client.query(`
      update bank_soal set topik = btrim(topik)
       where topik is not null and topik <> btrim(topik)
    `);

    await client.query("commit");

    const { rows } = await client.query<Record<string, number>>(`
      select (select count(*)::int from topik_bank) as topik,
             (select count(*)::int from bank_soal where topik is not null) as soal_bertopik
    `);

    console.log("Migration topik bank selesai.");
    console.log(`  topik baru       : ${dibuat[0].n}`);
    console.log(`  label dirapikan  : ${dirapikan ?? 0}`);
    for (const [tabel, n] of Object.entries(rows[0])) {
      console.log(`  ${tabel.padEnd(16)}: ${n}`);
    }
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