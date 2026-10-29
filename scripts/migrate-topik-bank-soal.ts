/**
 * Menautkan soal bank ke baris topik.
 *
 *   pnpm tsx scripts/migrate-topik-bank-soal.ts
 *
 * `topik_bank` sudah ada, tetapi `bank_soal` masih menyimpan topik sebagai teks
 * bebas. Selama itu terjadi, "topik" hanyalah label: topik kosong tidak bisa
 * ada, dan mengganti nama topik berarti mengejar semua soal yang menyebut nama
 * lama. Kolom `topik_id` membuat soalnya benar-benar *dimiliki* sebuah topik.
 *
 * `bank_soal.topik` tidak dihapus. Salinan nama tetap dipakai sebagai label
 * singkat saat soal disalin ke kuis, dan tetap dijaga sinkron oleh aplikasi.
 *
 * Backfill memakai nama yang sama (tanpa peduli huruf besar/kecil) dalam
 * (guru, mapel) yang sama. Soal yang topiknya kosong dibiarkan `topik_id` null;
 * soal seperti itu tidak muncul di daftar per topik, tetapi tetap bisa dicari
 * dan tetap dinilai di kuis yang sudah menyalinnya.
 *
 * Idempoten: kolom dibuat kalau belum ada, dan backfill hanya menyentuh baris
 * yang `topik_id`-nya masih null.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // `on delete cascade`, bukan `set null`: soal tanpa topik tidak terlihat
    // oleh pemilih berbasis topik, jadi menghapus topik harus ikut menghapus
    // soalnya — kalau tidak, sisa soalnya jadi yatim yang tak bisa dijangkau.
    await client.query(`
      alter table bank_soal
        add column if not exists topik_id integer
          references topik_bank(id) on delete cascade
    `);

    await client.query(`
      create index if not exists bank_soal_topik_idx
        on bank_soal (topik_id, id)
    `);

    const { rowCount: tertaut } = await client.query(`
      update bank_soal b
         set topik_id = t.id
        from topik_bank t
       where b.topik_id is null
         and b.topik is not null
         and btrim(b.topik) <> ''
         and t.guru_id = b.guru_id
         and t.mapel_id is not distinct from b.mapel_id
         and lower(btrim(t.nama)) = lower(btrim(b.topik))
    `);

    const { rows: sisa } = await client.query<{ n: number }>(`
      select count(*)::int as n
        from bank_soal
       where topik_id is null
    `);

    const { rows: tanpaTopik } = await client.query<{ n: number }>(`
      select count(*)::int as n
        from bank_soal
       where topik_id is not null and topik is distinct from (
         select t.nama from topik_bank t where t.id = bank_soal.topik_id
       ) and topik is not null
    `);

    // Label lama yang tidak lagi sama dengan nama topiknya hanya membuat bingung
    // saat dibaca; samakan sekali di sini, aplikasi menjaga sisanya.
    await client.query(`
      update bank_soal b
         set topik = t.nama
        from topik_bank t
       where b.topik_id = t.id
         and b.topik is distinct from t.nama
    `);

    await client.query("commit");

    console.log("Migration topik → soal selesai.");
    console.log(`  soal tertaut     : ${tertaut ?? 0}`);
    console.log(`  soal tanpa topik : ${sisa[0].n}`);
    console.log(`  label disamakan  : ${tanpaTopik[0].n}`);
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
