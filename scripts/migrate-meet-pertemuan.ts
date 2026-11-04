/**
 * Pertemuan — id event Google Calendar.
 *
 *   pnpm tsx scripts/migrate-meet-pertemuan.ts
 *
 * The Meet link alone is not enough to keep in step: when a teacher moves a
 * meeting to another date, the calendar event has to move too, and the only
 * handle on it is the event id Google returned when it was created.
 *
 * Idempotent: safe to run again.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from information_schema.columns
           where table_name = 'pertemuan' and column_name = 'google_event_id'
        ) then
          alter table pertemuan add column google_event_id text;
        end if;
      end $$;
    `);

    await client.query("commit");

    const { rows } = await client.query<{ total: number; punya: number }>(
      `select count(*)::int as total,
              count(google_event_id)::int as punya
         from pertemuan`,
    );
    console.log(`${rows[0].punya} dari ${rows[0].total} pertemuan punya event Meet`);
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
