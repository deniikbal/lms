/**
 * Pembagian Mengajar — schema.
 *
 *   pnpm tsx scripts/migrate-pembagian.ts
 *
 * Adds the `jadwal` table (one row = one weekly slot of one room) and the
 * `kkm` setting used as the default when a room is created from the teaching
 * assignment screen.
 *
 * `ruang` already has `kkm`, `bobot_*`, and the unique index
 * `ruang_scope_unique (tahun_ajaran_id, kelas_id, mapel_id)` that makes
 * "one mapel per class per year" true — the screen relies on it for its upsert.
 *
 * Idempotent: safe to run again.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

const KKM_DEFAULT = "75";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      create table if not exists jadwal (
        id          serial primary key,
        ruang_id    integer not null references ruang(id) on delete cascade,
        hari        smallint not null,
        jam_mulai   time not null,
        jam_selesai time not null,
        link_meet   text,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        constraint jadwal_hari_range check (hari between 1 and 6),
        constraint jadwal_jam_order check (jam_selesai > jam_mulai)
      )
    `);

    // Every conflict check is scoped to one class + year, so the join starts
    // from the room.
    await client.query(
      `create index if not exists jadwal_ruang_hari_idx on jadwal (ruang_id, hari)`,
    );

    // The default KKM a new room inherits. Kept in `pengaturan` so it can be
    // changed without a deploy.
    await client.query(
      `insert into pengaturan (kunci, nilai) values ('kkm', $1)
       on conflict (kunci) do nothing`,
      [KKM_DEFAULT],
    );

    await client.query("commit");

    const { rows } = await client.query<{
      jadwal: number;
      ruang: number;
      kkm: string | null;
    }>(`
      select (select count(*)::int from jadwal) as jadwal,
             (select count(*)::int from ruang) as ruang,
             (select nilai from pengaturan where kunci = 'kkm') as kkm
    `);
    console.log("jadwal rows :", rows[0].jadwal);
    console.log("ruang rows  :", rows[0].ruang);
    console.log("kkm default :", rows[0].kkm);
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
