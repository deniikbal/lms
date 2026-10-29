import { pool } from "../src/lib/db";

/**
 * Repairs `soal.pilihan` and `bank_soal.pilihan`.
 *
 * The old seed wrote options as `[{ teks, kunci }]` — the letter lived on each
 * option and `jawaban` was set separately. Everything else in the app writes
 * `{ A: "…", B: "…" }`. Reading the array shape as a map put a raw option
 * object where React expects a string, so the pages crashed on that one row.
 *
 * The read path now tolerates both shapes (`pilihanTersimpan`), which means the
 * app already works. This script is what makes the *stored* data single-shaped,
 * so comparisons like `b.pilihan is distinct from s.pilihan` (the "changed in
 * the bank" check) stop reporting a difference that is only a format mismatch.
 *
 * Idempotent: rows already in object form are left untouched.
 */
async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows } = await client.query<{
      id: number;
      pilihan: unknown;
      jawaban: string | null;
    }>(
      `select id, pilihan, jawaban
         from soal
        where jsonb_typeof(pilihan) = 'array'
        order by id`,
    );

    let diubah = 0;
    let dilewati = 0;

    for (const row of rows) {
      const daftar = Array.isArray(row.pilihan) ? row.pilihan : [];
      const pilihan: Record<string, string> = {};
      let kunci: string | null = null;

      daftar.forEach((item, index) => {
        const huruf = "ABCDE"[index];
        if (!huruf || !item || typeof item !== "object") return;
        const entri = item as { teks?: unknown; kunci?: unknown };
        const teks = typeof entri.teks === "string" ? entri.teks.trim() : "";
        if (teks !== "") pilihan[huruf] = teks;
        if (typeof entri.kunci === "string" && entri.kunci.trim() !== "") {
          kunci = entri.kunci.trim();
        } else if (entri.kunci === true) {
          kunci = huruf;
        }
      });

      if (Object.keys(pilihan).length === 0) {
        // An array with nothing usable in it: leave the row for a human rather
        // than silently emptying a question.
        dilewati += 1;
        continue;
      }

      await client.query(
        `update soal set pilihan = $2::jsonb, jawaban = coalesce(jawaban, $3)
          where id = $1`,
        [row.id, JSON.stringify(pilihan), kunci ?? row.jawaban],
      );
      diubah += 1;
    }

    // The bank holds copies of these same rows, taken by the backfill.
    const { rowCount: bankDiubah } = await client.query(
      `update bank_soal b
          set pilihan = s.pilihan,
              jawaban = coalesce(b.jawaban, s.jawaban)
         from soal s
        where jsonb_typeof(b.pilihan) = 'array'
          and s.bank_soal_id = b.id
          and jsonb_typeof(s.pilihan) = 'object'`,
    );

    await client.query("commit");

    console.log("Perbaikan format pilihan selesai.");
    console.log(`  soal diubah      : ${diubah}`);
    console.log(`  soal dilewati    : ${dilewati}`);
    console.log(`  bank_soal diubah : ${bankDiubah ?? 0}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});