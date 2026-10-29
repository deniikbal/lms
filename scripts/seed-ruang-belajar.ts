/**
 * Demo content for one room, so the room page has something to show.
 *
 *   pnpm tsx scripts/seed-ruang-belajar.ts           # create
 *   pnpm tsx scripts/seed-ruang-belajar.ts --reset   # remove
 *
 * Targets the PKWU room of X 1 (the room the teacher account is assigned to).
 * Everything it writes is listed in `DEMO` and deleted by `--reset`, so the
 * script never touches content you created by hand.
 *
 * Idempotent: running it twice does not duplicate rows.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

const JUDUL_PERTEMUAN = ["Konsep dasar kewirausahaan", "Rencana usaha sederhana"];
const JUDUL_TUGAS = ["Proposal usaha kecil"];
const JUDUL_KUIS = ["Kuis kewirausahaan"];

async function main() {
  const reset = process.argv.includes("--reset");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    const { rows: ruang } = await client.query<{
      id: number;
      kelas_id: number;
      nama: string;
    }>(
      `select r.id, r.kelas_id, k.nama
         from ruang r
         join kelas k on k.id = r.kelas_id
         join mapel m on m.id = r.mapel_id
        where k.nama = 'X 1' and m.kode = 'PKWU'
        order by r.id
        limit 1`,
    );

    const target = ruang[0];
    if (!target) {
      throw new Error("Ruang PKWU untuk kelas X 1 tidak ditemukan.");
    }

    if (reset) {
      await client.query(`delete from pertemuan where ruang_id = $1 and judul = any($2)`, [
        target.id,
        JUDUL_PERTEMUAN,
      ]);
      await client.query(`delete from tugas where ruang_id = $1 and judul = any($2)`, [
        target.id,
        JUDUL_TUGAS,
      ]);
      await client.query(`delete from kuis where ruang_id = $1 and judul = any($2)`, [
        target.id,
        JUDUL_KUIS,
      ]);
      await client.query(`commit`);
      console.log(`reset: demo content removed from ruang ${target.id}`);
      return;
    }

    const { rows: siswa } = await client.query<{ id: string }>(
      `select id from "user"
        where role = 'siswa' and aktif and kelas_id = $1
        order by name limit 24`,
      [target.kelas_id],
    );
    if (siswa.length === 0) throw new Error("Kelas ini belum punya siswa aktif.");

    // ------------------------------------------------------------ pertemuan 1
    const p1 = await client.query<{ id: number }>(
      `insert into pertemuan
         (ruang_id, urutan, judul, tanggal, terbit, presensi_buka, presensi_tutup)
       values ($1, 1, $2, '2026-10-12', true,
               ('2026-10-12'::date + '07:00'::time) at time zone 'Asia/Jakarta',
               ('2026-10-12'::date + '15:00'::time) at time zone 'Asia/Jakarta')
       on conflict (ruang_id, urutan) do update set judul = excluded.judul
       returning id`,
      [target.id, JUDUL_PERTEMUAN[0]],
    );
    const id1 = p1.rows[0].id;

    // 19 hadir, 2 izin, 1 sakit — 22 recorded, the rest left empty on purpose so
    // the "not yet recorded" cell is visible in the matrix.
    const status = [
      ...siswa.slice(0, 19).map(() => "hadir"),
      ...siswa.slice(19, 21).map(() => "izin"),
      "sakit",
    ];
    for (let i = 0; i < status.length; i += 1) {
      await client.query(
        `insert into presensi (pertemuan_id, siswa_id, status)
         values ($1, $2, $3)
         on conflict (pertemuan_id, siswa_id) do update set status = excluded.status`,
        [id1, siswa[i].id, status[i]],
      );
    }
    for (const murid of siswa.slice(0, 17)) {
      await client.query(
        `insert into materi_selesai (pertemuan_id, siswa_id) values ($1, $2)
         on conflict do nothing`,
        [id1, murid.id],
      );
    }

    // ------------------------------------------------------------ pertemuan 2
    // Today, with the attendance window still open — the state the brief calls
    // out as risky if it closes with nobody recorded.
    await client.query(
      `insert into pertemuan
         (ruang_id, urutan, judul, tanggal, terbit, presensi_buka, presensi_tutup)
       values ($1, 2, $2, current_date, true,
               (current_date + '07:00'::time) at time zone 'Asia/Jakarta',
               (current_date + '15:00'::time) at time zone 'Asia/Jakarta')
       on conflict (ruang_id, urutan) do update set judul = excluded.judul`,
      [target.id, JUDUL_PERTEMUAN[1]],
    );

    // --------------------------------------------------------------- tugas
    await client.query(
      `insert into tugas (ruang_id, judul, tenggat, tipe, boleh_terlambat, terbit)
       select $1, $2, ('2026-11-04'::date + '23:59'::time) at time zone 'Asia/Jakarta',
              'file', true, true
        where not exists (select 1 from tugas where ruang_id = $1 and judul = $2)`,
      [target.id, JUDUL_TUGAS[0]],
    );

    // ---------------------------------------------------------------- kuis
    const kuis = await client.query<{ id: number }>(
      `insert into kuis (ruang_id, judul, mulai, selesai, durasi_menit, terbit)
       select $1, $2,
              ('2026-10-29'::date + '07:00'::time) at time zone 'Asia/Jakarta',
              ('2026-10-29'::date + '21:00'::time) at time zone 'Asia/Jakarta',
              60, false
        where not exists (select 1 from kuis where ruang_id = $1 and judul = $2)
       returning id`,
      [target.id, JUDUL_KUIS[0]],
    );
    if (kuis.rows[0]) {
      // `pilihan` is an object keyed by letter everywhere else in the app; the
      // array-of-{teks,kunci} shape this script used to write is what made the
      // bank page render an option object as a React child.
      await client.query(
        `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan)
         values ($1, $2, $3::jsonb, 'B', 1, 1)`,
        [
          kuis.rows[0].id,
          "Langkah pertama menyusun rencana usaha adalah…",
          JSON.stringify({
            A: "Mencari investor",
            B: "Menentukan ide dan pasar sasaran",
            C: "Menyewa tempat",
            D: "Membuat logo",
          }),
        ],
      );
    }

    // --------------------------------------------------------------- jadwal
    await client.query(
      `insert into jadwal (ruang_id, hari, jam_mulai, jam_selesai, link_meet)
       select $1, 2, '10:00', '11:30', 'https://meet.google.com/216-b304-0ae'
        where not exists (
          select 1 from jadwal where ruang_id = $1 and hari = 2 and jam_mulai = '10:00'
        )`,
      [target.id],
    );

    await client.query("commit");

    const { rows: ringkas } = await client.query<Record<string, number>>(
      `select (select count(*)::int from pertemuan where ruang_id = $1) as pertemuan,
              (select count(*)::int from presensi p join pertemuan pt on pt.id = p.pertemuan_id
                where pt.ruang_id = $1) as presensi,
              (select count(*)::int from materi_selesai m join pertemuan pt on pt.id = m.pertemuan_id
                where pt.ruang_id = $1) as materi_selesai,
              (select count(*)::int from tugas where ruang_id = $1) as tugas,
              (select count(*)::int from kuis where ruang_id = $1) as kuis`,
      [target.id],
    );
    console.log(`ruang ${target.id} (${target.nama} · PKWU)`);
    for (const [k, v] of Object.entries(ringkas[0])) console.log(`  ${k.padEnd(15)} ${v}`);
    console.log("done — hapus dengan --reset");
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
