/**
 * Migration: tahun ajaran
 *
 *   pnpm tsx scripts/migrate-tahun-ajaran.ts
 *
 * Idempotent — safe to re-run.
 *
 * Creates the tahun_ajaran table and seeds a default entry if it does not
 * already exist.
 */

import { Pool } from "pg";

process.loadEnvFile(".env");

const DEFAULT_TAHUN = { nama: "2026/2027", semester: "Ganjil" };

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // --- create table -------------------------------------------------------
    await client.query(`
      create table if not exists tahun_ajaran (
        id         serial primary key,
        nama       text not null unique,
        semester   text not null default 'Ganjil'
                     check (semester in ('Ganjil', 'Genap')),
        aktif      boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    // --- seed default -------------------------------------------------------
    const { rowCount } = await client.query(
      `insert into tahun_ajaran (nama, semester, aktif)
           values ($1, $2, true)
        on conflict (nama) do nothing`,
      [DEFAULT_TAHUN.nama, DEFAULT_TAHUN.semester],
    );

    await client.query("commit");

    console.log("Migration tahun_ajaran selesai.");
    console.log(`  seeded    : ${(rowCount ?? 0) > 0 ? "1 row (default)" : "kosong (sudah ada)"}`);
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