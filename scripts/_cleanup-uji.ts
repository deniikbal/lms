/**
 * Throwaway helper: remove the "Uji Modal …" classes that the Playwright suite
 * creates, so a crashed run does not leave test rows behind.
 *
 *   pnpm tsx scripts/_cleanup-uji.ts
 */
import { Pool } from "pg";

async function main() {
  process.loadEnvFile(".env");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const before = await pool.query(
    `select id, nama, tingkat from kelas where nama like 'Uji Modal%' order by id`,
  );
  console.log("to delete:", before.rows);
  const del = await pool.query(
    `delete from kelas where nama like 'Uji Modal%' returning id`,
  );
  console.log("deleted:", del.rowCount);
  const after = await pool.query(`select count(*)::int as n from kelas`);
  console.log("kelas now:", after.rows[0].n);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
