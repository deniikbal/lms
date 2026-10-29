/**
 * Ruang belajar — content tables.
 *
 *   pnpm tsx scripts/migrate-ruang-belajar.ts
 *
 * `ruang` already holds the identity of a room (year × class × subject ×
 * teacher) and its grading settings. Everything that lives *inside* the room
 * hangs off it here:
 *
 *   pertemuan   one meeting, with an optional attendance window
 *   presensi    one row per student per meeting (hadir/izin/sakit/alpa)
 *   materi_selesai  a student ticking a meeting as learnt
 *   tugas       an assignment; pengumpulan its submissions
 *   kuis        a quiz; soal its questions; percobaan its attempts
 *   diskusi     a question or reply in the room
 *
 * Every child table cascades from `ruang`, so deleting a room cleans up after
 * itself — which is why the Pembagian Mengajar screen refuses to delete a room
 * that already has content.
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
      create table if not exists pertemuan (
        id            serial primary key,
        ruang_id      integer not null references ruang(id) on delete cascade,
        urutan        integer not null,
        judul         text not null,
        tanggal       date not null,
        terbit        boolean not null default false,
        video_url     text,
        lampiran_nama text,
        lampiran_url  text,
        presensi_buka  timestamptz,
        presensi_tutup timestamptz,
        created_at    timestamptz not null default now(),
        updated_at    timestamptz not null default now(),
        constraint pertemuan_urutan_pos check (urutan > 0),
        constraint pertemuan_scope_unique unique (ruang_id, urutan),
        constraint pertemuan_presensi_order
          check (presensi_tutup is null or presensi_buka is null
                 or presensi_tutup > presensi_buka)
      )
    `);

    await client.query(`
      create table if not exists presensi (
        id           serial primary key,
        pertemuan_id integer not null references pertemuan(id) on delete cascade,
        siswa_id     text not null references "user"(id) on delete cascade,
        status       text not null,
        dicatat_at   timestamptz not null default now(),
        constraint presensi_status check (status in ('hadir','izin','sakit','alpa')),
        constraint presensi_unique unique (pertemuan_id, siswa_id)
      )
    `);

    await client.query(`
      create table if not exists materi_selesai (
        pertemuan_id integer not null references pertemuan(id) on delete cascade,
        siswa_id     text not null references "user"(id) on delete cascade,
        created_at   timestamptz not null default now(),
        primary key (pertemuan_id, siswa_id)
      )
    `);

    await client.query(`
      create table if not exists tugas (
        id               serial primary key,
        ruang_id         integer not null references ruang(id) on delete cascade,
        judul            text not null,
        deskripsi        text,
        tenggat          timestamptz,
        tipe             text not null default 'file',
        boleh_terlambat  boolean not null default true,
        terbit           boolean not null default false,
        created_at       timestamptz not null default now(),
        updated_at       timestamptz not null default now(),
        constraint tugas_tipe check (tipe in ('file','teks','keduanya'))
      )
    `);

    await client.query(`
      create table if not exists pengumpulan (
        id              serial primary key,
        tugas_id        integer not null references tugas(id) on delete cascade,
        siswa_id        text not null references "user"(id) on delete cascade,
        file_url        text,
        teks            text,
        nilai           integer,
        dikumpulkan_at  timestamptz not null default now(),
        constraint pengumpulan_unique unique (tugas_id, siswa_id),
        constraint pengumpulan_nilai_range check (nilai is null or nilai between 0 and 100)
      )
    `);

    await client.query(`
      create table if not exists kuis (
        id            serial primary key,
        ruang_id      integer not null references ruang(id) on delete cascade,
        judul         text not null,
        mulai         timestamptz,
        selesai       timestamptz,
        durasi_menit  integer not null default 60,
        terbit        boolean not null default false,
        created_at    timestamptz not null default now(),
        updated_at    timestamptz not null default now(),
        constraint kuis_durasi_pos check (durasi_menit > 0),
        constraint kuis_jendela_order
          check (selesai is null or mulai is null or selesai > mulai)
      )
    `);

    await client.query(`
      create table if not exists soal (
        id         serial primary key,
        kuis_id    integer not null references kuis(id) on delete cascade,
        pertanyaan text not null,
        pilihan    jsonb,
        jawaban    text,
        skor       integer not null default 1,
        urutan     integer not null default 1,
        constraint soal_skor_pos check (skor > 0)
      )
    `);

    await client.query(`
      create table if not exists percobaan (
        id       serial primary key,
        kuis_id  integer not null references kuis(id) on delete cascade,
        siswa_id text not null references "user"(id) on delete cascade,
        mulai    timestamptz not null default now(),
        selesai  timestamptz,
        nilai    integer,
        constraint percobaan_nilai_range check (nilai is null or nilai between 0 and 100)
      )
    `);

    await client.query(`
      create table if not exists diskusi (
        id         serial primary key,
        ruang_id   integer not null references ruang(id) on delete cascade,
        siswa_id   text not null references "user"(id) on delete cascade,
        isi        text not null,
        induk_id   integer references diskusi(id) on delete cascade,
        created_at timestamptz not null default now(),
        constraint diskusi_isi_length check (char_length(btrim(isi)) between 1 and 2000)
      )
    `);

    // The page reads every one of these by room, so each child gets an index on
    // the column that joins it back to `ruang` (directly or through its parent).
    await client.query(`
      create index if not exists pertemuan_ruang_idx on pertemuan (ruang_id, urutan desc);
      create index if not exists presensi_pertemuan_idx on presensi (pertemuan_id);
      create index if not exists presensi_siswa_idx on presensi (siswa_id);
      create index if not exists materi_selesai_siswa_idx on materi_selesai (siswa_id);
      create index if not exists tugas_ruang_idx on tugas (ruang_id);
      create index if not exists pengumpulan_tugas_idx on pengumpulan (tugas_id);
      create index if not exists kuis_ruang_idx on kuis (ruang_id);
      create index if not exists soal_kuis_idx on soal (kuis_id, urutan);
      create index if not exists percobaan_kuis_idx on percobaan (kuis_id);
      create index if not exists diskusi_ruang_idx on diskusi (ruang_id, created_at desc);
    `);

    await client.query("commit");

    const { rows } = await client.query<Record<string, number>>(`
      select (select count(*)::int from pertemuan) as pertemuan,
             (select count(*)::int from presensi) as presensi,
             (select count(*)::int from materi_selesai) as materi_selesai,
             (select count(*)::int from tugas) as tugas,
             (select count(*)::int from pengumpulan) as pengumpulan,
             (select count(*)::int from kuis) as kuis,
             (select count(*)::int from soal) as soal,
             (select count(*)::int from percobaan) as percobaan,
             (select count(*)::int from diskusi) as diskusi
    `);
    const row = rows[0];
    for (const [table, n] of Object.entries(row)) {
      console.log(`${table.padEnd(15)} ${n}`);
    }
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
