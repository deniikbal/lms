/**
 * Migration: student profile + kelas.
 *
 *   pnpm tsx scripts/migrate-siswa.ts
 *
 * Idempotent — safe to re-run. Adds the columns described in
 * ANALISIS_LMS_PJJ.md §4.1 (users) plus the minimal `kelas` table needed to
 * reference a student's class, then seeds demo classes and students so the
 * admin screen has something to page through.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

const KELAS = [
  { nama: "VII A", tingkat: 7 },
  { nama: "VIII A", tingkat: 8 },
  { nama: "IX A", tingkat: 9 },
  { nama: "X TKJ 1", tingkat: 10 },
  { nama: "XI TKJ 1", tingkat: 11 },
  { nama: "XII TKJ 1", tingkat: 12 },
];

const NAMA_SISWA = [
  "Adi Nugroho", "Ayu Lestari", "Bagas Prakoso", "Bella Safitri", "Candra Wijaya",
  "Citra Maharani", "Dedi Kurniawan", "Dewi Anggraini", "Eko Prasetyo", "Fitri Handayani",
  "Galih Ramadhan", "Gita Puspita", "Hadi Santoso", "Indah Permata", "Joko Susilo",
  "Kartika Sari", "Lukman Hakim", "Maya Sari", "Nanda Pratama", "Nia Ramadhani",
  "Oki Setiawan", "Putri Wulandari", "Rangga Aditya", "Rina Marlina", "Sandi Saputra",
  "Sinta Nurhaliza", "Taufik Hidayat", "Umi Kalsum", "Vino Bastian", "Wulan Sari",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      create table if not exists kelas (
        id          serial primary key,
        nama        text not null unique,
        tingkat     smallint,
        created_at  timestamptz not null default now()
      )
    `);

    await client.query(`
      alter table "user" add column if not exists username          text,
                          add column if not exists "displayUsername" text,
                          add column if not exists jk                text,
                          add column if not exists kelas_id          integer references kelas(id) on delete set null,
                          add column if not exists aktif             boolean not null default true,
                          add column if not exists terakhir_aktif_at timestamptz
    `);

    // Students may be created without an email address; NISN is the login.
    await client.query(`alter table "user" alter column email drop not null`);

    // NULLs do not collide in a Postgres unique index, so staff without a
    // username are fine.
    await client.query(
      `create unique index if not exists user_username_key on "user" (username)`,
    );

    await client.query(`
      do $$
      begin
        if not exists (select 1 from pg_constraint where conname = 'user_jk_check') then
          alter table "user" add constraint user_jk_check check (jk in ('L', 'P'));
        end if;
      end $$;
    `);

    for (const k of KELAS) {
      await client.query(
        `insert into kelas (nama, tingkat) values ($1, $2)
         on conflict (nama) do nothing`,
        [k.nama, k.tingkat],
      );
    }

    const { rows: kelasRows } = await client.query<{ id: number }>(
      `select id from kelas order by tingkat`,
    );

    const { hashPassword } = await import("better-auth/crypto");
    const now = new Date();
    let created = 0;

    for (const [index, nama] of NAMA_SISWA.entries()) {
      const nisn = `00612345${String(index + 1).padStart(2, "0")}`;
      const id = `siswa-${nisn}`;
      const kelasId = kelasRows[index % kelasRows.length]?.id ?? null;

      const inserted = await client.query(
        `insert into "user"
           (id, name, email, "emailVerified", "createdAt", "updatedAt",
            role, username, "displayUsername", jk, kelas_id, aktif, terakhir_aktif_at)
         values ($1, $2, null, false, $3, $3, 'siswa', $4, $4, $5, $6, $7, $8)
         on conflict (id) do nothing`,
        [
          id,
          nama,
          now,
          nisn,
          index % 2 === 0 ? "L" : "P",
          kelasId,
          index % 7 !== 0, // a few inactive rows so the status column is exercised
          index % 3 === 0 ? null : new Date(now.getTime() - index * 3_600_000),
        ],
      );

      if (inserted.rowCount === 0) continue;

      // Better Auth keeps credentials in `account`, one row per provider.
      await client.query(
        `insert into account
           (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $3, $4, $5, $5)
         on conflict (id) do nothing`,
        [`acc-${id}`, id, id, await hashPassword(nisn), now],
      );

      created += 1;
    }

    await client.query("commit");

    console.log(`Migration selesai. ${KELAS.length} kelas, ${created} siswa baru.`);
    console.log("Login siswa memakai NISN sebagai username dan password.");
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
