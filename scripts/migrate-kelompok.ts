/**
 * Tugas kelompok — group assignments.
 *
 *   pnpm tsx scripts/migrate-kelompok.ts
 *
 * Adds, idempotently:
 *
 *   tugas.tipe_kerja      'individu' | 'kelompok' (default individu)
 *   tugas.nilai_sama      one grade for the whole group (default true)
 *   kelompok_tugas        groups of one task: (tugas_id, nama)
 *   kelompok_anggota      members: (kelompok_id, siswa_id)
 *   pengumpulan.kelompok_id  the group a submission was sent for
 *
 * It also swaps the submission uniqueness key: `(tugas_id, siswa_id)` becomes
 * `(tugas_id, coalesce('k' || kelompok_id, siswa_id))`. Under the old key a
 * student who handed work in for one group could not submit again after moving
 * to another group — the insert collided on their `siswa_id` even though the
 * answer belonged to a different group. The key now names the group for a group
 * submission and the student for an individual one, matching how the counters
 * in `listTugas` already read the table.
 *
 * Model in one line: a group task has exactly one *content* submission per
 * group (the uploader sits in `siswa_id`), while grades live per student —
 * either copied by the sheet (nilai_sama) or entered per member. Because the
 * recap query (`getNilai`) already reads `avg(p.nilai) per siswa_id`, both
 * modes flow into the report without touching it.
 *
 * Existing rows are untouched: every task becomes 'individu', which is what
 * it was before this column existed.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      alter table tugas add column if not exists tipe_kerja
        text not null default 'individu'
        check (tipe_kerja in ('individu', 'kelompok'))
    `);

    await client.query(`
      alter table tugas add column if not exists nilai_sama
        boolean not null default true
    `);

    await client.query(`
      create table if not exists kelompok_tugas (
        id          serial primary key,
        tugas_id    integer not null references tugas(id) on delete cascade,
        nama        text not null,
        created_at  timestamptz not null default now(),
        unique (tugas_id, nama)
      )
    `);

    await client.query(`
      create table if not exists kelompok_anggota (
        kelompok_id integer not null references kelompok_tugas(id) on delete cascade,
        siswa_id    text not null references "user"(id) on delete cascade,
        primary key (kelompok_id, siswa_id)
      )
    `);

    await client.query(`
      create index if not exists kelompok_anggota_siswa_idx
        on kelompok_anggota (siswa_id)
    `);

    await client.query(`
      alter table pengumpulan add column if not exists kelompok_id
        integer references kelompok_tugas(id) on delete cascade
    `);

    // Submissions sent for a group are indexed by group, not by student.
    await client.query(`
      create index if not exists pengumpulan_kelompok_idx
        on pengumpulan (kelompok_id)
    `);

    // One content submission per group for a group task, per student otherwise.
    // Written as a unique index rather than a constraint because the expression
    // is what varies — a constraint could not span the two cases.
    //
    // The drop doubles as the idempotency guard: it only exists on the first
    // run. Refuse rather than silently lose rows if old data would collide, and
    // drop the replacement so a half-applied run can be retried from scratch.
    const lama = await client.query<{ conname: string }>(
      `select conname from pg_constraint
        where conrelid = 'pengumpulan'::regclass
          and conname = 'pengumpulan_unique'`,
    );
    if (lama.rowCount) {
      const bentrok = await client.query<{ n: number }>(
        `select count(*)::int as n from (
           select tugas_id, coalesce('k' || kelompok_id, siswa_id) as kunci
             from pengumpulan
            group by 1, 2 having count(*) > 1
         ) g`,
      );
      if (bentrok.rows[0]!.n > 0) {
        await client.query("rollback");
        throw new Error(
          "Ada pengumpulan ganda per tugas/kelompok. Perbaiki datanya dahulu, lalu jalankan ulang migrasi ini.",
        );
      }

      await client.query(
        `drop index if exists pengumpulan_tugas_kunci_unique`,
      );
      await client.query(
        `alter table pengumpulan drop constraint pengumpulan_unique`,
      );
      await client.query(`
        create unique index pengumpulan_tugas_kunci_unique
          on pengumpulan (tugas_id, coalesce('k' || kelompok_id, siswa_id))
      `);
    }

    await client.query("commit");
    console.log("Migrasi tugas kelompok selesai.");
  } catch (galat) {
    await client.query("rollback");
    throw galat;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((galat) => {
  console.error(galat);
  process.exit(1);
});
