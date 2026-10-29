/**
 * Bank soal — a teacher-owned question bank, on top of `migrate-kuis.ts`.
 *
 *   pnpm tsx scripts/migrate-bank-soal.ts
 *
 * Until now a question lived and died with one quiz, and a quiz belongs to one
 * room (year × class × subject). A teacher with the same subject in twelve
 * classes had to write the same twenty questions twelve times. The bank breaks
 * that: `bank_soal` holds the master copy, scoped to the teacher and the
 * subject they teach.
 *
 * `soal` stays exactly as it is — one row per question *inside a quiz* — and
 * merely gains `bank_soal_id`. The question text is still copied into `soal`
 * rather than referenced, because `percobaan.jawaban` is keyed by `soal.id`.
 * Re-pointing that key at the bank would repaint the scores of students who
 * already sat the quiz.
 *
 * Backfill: every existing `soal` row is promoted into the bank of the teacher
 * who owns the room, de-duplicated on the question content. Twelve copies of
 * the same question across twelve classes collapse into one bank row.
 *
 * Idempotent: safe to run again. Rooms with no teacher (`guru_id is null`)
 * cannot be backfilled and are reported instead of silently skipped.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // ------------------------------------------------------------- bank_soal
    await client.query(`
      create table if not exists bank_soal (
        id         serial primary key,
        guru_id    text not null references "user"(id) on delete cascade,
        mapel_id   integer references mapel(id) on delete set null,
        jenis      text not null default 'pg',
        pertanyaan text not null,
        pilihan    jsonb,
        jawaban    text,
        bobot      integer not null default 1,
        topik      text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint bank_soal_jenis_sah check (jenis in ('pg', 'esai')),
        constraint bank_soal_bobot_range check (bobot between 1 and 100),
        constraint bank_soal_pertanyaan_length
          check (char_length(btrim(pertanyaan)) between 1 and 2000)
      )
    `);

    // The list screen filters by owner + subject on every load.
    await client.query(`
      create index if not exists bank_soal_pemilik_idx on bank_soal (guru_id, mapel_id)
    `);

    // Search is free text over the question body. 'simple' rather than a real
    // dictionary: Indonesian would be stemmed by the wrong rules, and a false
    // stem is worse than no stem.
    await client.query(`
      create index if not exists bank_soal_pencarian_idx
        on bank_soal using gin (to_tsvector('simple', pertanyaan))
    `);

    // ------------------------------------------------------------------ soal
    // Nullable on purpose: a question written straight into a quiz (or one whose
    // bank row was deleted) is still a valid question.
    await client.query(`
      alter table soal
        add column if not exists bank_soal_id integer
          references bank_soal(id) on delete set null
    `);

    await client.query(`
      create index if not exists soal_bank_idx on soal (bank_soal_id)
    `);

    // -------------------------------------------------------------- backfill
    // One bank row per distinct question per (teacher, subject). `distinct on`
    // does the collapsing; the `not exists` keeps a re-run from duplicating.
    const { rows: dibuat } = await client.query<{ n: number }>(`
      with sumber as (
        select r.guru_id,
               r.mapel_id,
               s.jenis,
               s.pertanyaan,
               coalesce(s.pilihan, '{}'::jsonb) as pilihan,
               s.jawaban,
               s.bobot
          from soal s
          join kuis q on q.id = s.kuis_id
          join ruang r on r.id = q.ruang_id
         where s.bank_soal_id is null
           and r.guru_id is not null
      ),
      unik as (
        select distinct on (guru_id, mapel_id, jenis, pertanyaan, pilihan, jawaban, bobot)
               guru_id, mapel_id, jenis, pertanyaan, pilihan, jawaban, bobot
          from sumber
      ),
      baru as (
        insert into bank_soal (guru_id, mapel_id, jenis, pertanyaan, pilihan, jawaban, bobot)
        select u.guru_id, u.mapel_id, u.jenis, u.pertanyaan, u.pilihan, u.jawaban, u.bobot
          from unik u
         where not exists (
           select 1 from bank_soal b
            where b.guru_id = u.guru_id
              and b.mapel_id is not distinct from u.mapel_id
              and b.jenis = u.jenis
              and b.pertanyaan = u.pertanyaan
              and b.pilihan is not distinct from u.pilihan
              and b.jawaban is not distinct from u.jawaban
              and b.bobot = u.bobot
         )
        returning id
      )
      select count(*)::int as n from baru
    `);

    // The target table is not visible inside a FROM-clause join, so the match
    // happens in a subquery and the update reads from its result.
    const { rows: tertaut } = await client.query<{ n: number }>(`
      with cocok as (
        select s2.id as soal_id, b.id as bank_id
          from soal s2
          join kuis q on q.id = s2.kuis_id
          join ruang r on r.id = q.ruang_id
          join bank_soal b
            on b.guru_id = r.guru_id
           and b.mapel_id is not distinct from r.mapel_id
           and b.jenis = s2.jenis
           and b.pertanyaan = s2.pertanyaan
           and b.pilihan is not distinct from coalesce(s2.pilihan, '{}'::jsonb)
           and b.jawaban is not distinct from s2.jawaban
           and b.bobot = s2.bobot
         where s2.bank_soal_id is null
      )
      update soal s
         set bank_soal_id = cocok.bank_id
        from cocok
       where s.id = cocok.soal_id
      returning s.id
    `);

    await client.query("commit");

    const { rows } = await client.query<Record<string, number>>(`
      select (select count(*)::int from bank_soal) as bank_soal,
             (select count(*)::int from soal) as soal,
             (select count(*)::int from soal where bank_soal_id is null) as soal_tanpa_bank,
             (select count(*)::int from soal s
                join kuis q on q.id = s.kuis_id
                join ruang r on r.id = q.ruang_id
               where s.bank_soal_id is null and r.guru_id is null) as soal_tanpa_guru
    `);

    console.log("Migration bank soal selesai.");
    console.log(`  bank_soal baru   : ${dibuat[0].n}`);
    console.log(`  soal tertaut     : ${tertaut.length}`);
    for (const [tabel, n] of Object.entries(rows[0])) {
      console.log(`  ${tabel.padEnd(17)}: ${n}`);
    }
    if ((rows[0].soal_tanpa_guru ?? 0) > 0) {
      console.log(
        "\n  Catatan: soal di ruang tanpa guru pengampu tidak bisa ditarik ke bank" +
          " (bank butuh pemilik). Tetapkan guru di Pembagian Mengajar lalu jalankan ulang.",
      );
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