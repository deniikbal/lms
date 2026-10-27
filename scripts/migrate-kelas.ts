/**
 * Migration: kelas (master data) + the tables the Kelas screen counts against.
 *
 *   pnpm tsx scripts/migrate-kelas.ts
 *
 * Idempotent — safe to re-run.
 *
 * The Kelas screen shows, per class, how many students and how many "ruang
 * belajar" (rooms) hang off it, and its delete rule relies on a real cascade.
 * That means the tables those numbers come from have to exist, so this script
 * also lays down the master tables the rest of the blueprint needs:
 *
 *   pengaturan    key-value app settings (here: `jenjang`)
 *   jurusan       TKJ / AKL / BD
 *   tahun_ajaran  needed by ruang
 *   mapel         needed by ruang
 *   ruang         one row = mapel + kelas + tahun ajaran
 *   pengumuman    kelas_id cascades, per the delete rule
 *
 * Only the columns the blueprint specifies are created; the pages that own
 * these tables (Jurusan, Mapel, Ruang, …) come later.
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

/** `jenjang` drives which `tingkat` values the class form offers. */
const JENJANG = "SMK";

const JURUSAN = [
  { kode: "TKJ", nama: "Teknik Komputer dan Jaringan" },
  { kode: "AKL", nama: "Akuntansi dan Keuangan Lembaga" },
  { kode: "BD", nama: "Bisnis Digital" },
];

const TAHUN_AJARAN = { nama: "2026/2027", semester: "Ganjil" };

const MAPEL = [
  { kode: "MTK", nama: "Matematika", kelompok: "Umum" },
  { kode: "BIN", nama: "Bahasa Indonesia", kelompok: "Umum" },
  { kode: "BING", nama: "Bahasa Inggris", kelompok: "Umum" },
  { kode: "PPKN", nama: "Pendidikan Pancasila dan Kewarganegaraan", kelompok: "Umum" },
  { kode: "SEJ", nama: "Sejarah", kelompok: "Umum" },
  { kode: "PJOK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", kelompok: "Umum" },
  { kode: "INF", nama: "Informatika", kelompok: "Umum" },
  { kode: "AI", nama: "Kecerdasan Artifisial", kelompok: "Muatan Lokal" },
  { kode: "BJAWA", nama: "Bahasa Jawa", kelompok: "Muatan Lokal" },
  { kode: "PKK", nama: "Projek Kreatif dan Kewirausahaan", kelompok: "Kejuruan" },
  { kode: "DTJ", nama: "Dasar-dasar Teknik Jaringan", kelompok: "Kejuruan" },
  { kode: "AD", nama: "Akuntansi Dasar", kelompok: "Kejuruan" },
];

/** Class name suffix → jurusan kode, so existing SMK classes get a jurusan. */
const JURUSAN_PER_KELAS: Record<string, string> = {
  "X TKJ 1": "TKJ",
  "XI TKJ 1": "TKJ",
  "XII TKJ 1": "TKJ",
  "X AKL 1": "AKL",
  "XI BD 1": "BD",
};

/**
 * Sample rooms so the "Mapel" column has something to count. Keyed by class
 * name; each entry is [mapel kode, teacher NIP].
 */
const RUANG_CONTOH: Record<string, [string, string][]> = {
  "X TKJ 1": [
    ["MTK", "198203112008012004"],
    ["BIN", "199001052015031002"],
    ["BING", "197905302005011006"],
    ["INF", "198811172014022001"],
    ["DTJ", "198805172013011005"],
  ],
  "XI TKJ 1": [
    ["MTK", "198612012009031009"],
    ["BIN", "199001052015031002"],
    ["BING", "197905302005011006"],
    ["PJOK", "198709092011012013"],
    ["DTJ", "198805172013011005"],
  ],
  "XII TKJ 1": [
    ["MTK", "198203112008012004"],
    ["BIN", "199001052015031002"],
    ["PPKN", "199206142019031008"],
    ["PKK", "199304212020122005"],
    ["DTJ", "198805172013011005"],
  ],
  "X AKL 1": [
    ["MTK", "198612012009031009"],
    ["BIN", "199001052015031002"],
    ["AD", "199304212020122005"],
    ["PKK", "199304212020122005"],
  ],
  "XI BD 1": [
    ["MTK", "198203112008012004"],
    ["BING", "197905302005011006"],
    ["AD", "199304212020122005"],
    ["PKK", "199304212020122005"],
  ],
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    // --- settings -----------------------------------------------------------
    await client.query(`
      create table if not exists pengaturan (
        kunci      text primary key,
        nilai      text,
        updated_at timestamptz not null default now()
      )
    `);
    await client.query(
      `insert into pengaturan (kunci, nilai) values ('jenjang', $1)
       on conflict (kunci) do nothing`,
      [JENJANG],
    );

    // --- master tables ------------------------------------------------------
    await client.query(`
      create table if not exists jurusan (
        id         serial primary key,
        kode       text not null unique,
        nama       text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

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

    await client.query(`
      create table if not exists mapel (
        id         serial primary key,
        kode       text not null unique,
        nama       text not null,
        kelompok   text not null default 'Umum'
                     check (kelompok in ('Umum', 'Kejuruan', 'Muatan Lokal')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    // --- kelas: new columns + the bounds the form enforces ------------------
    await client.query(
      `alter table kelas
         add column if not exists jurusan_id integer references jurusan(id) on delete set null,
         add column if not exists updated_at timestamptz not null default now()`,
    );

    // Named constraints so re-running does not stack duplicates.
    await client.query(`
      do $$
      begin
        if not exists (select 1 from pg_constraint where conname = 'kelas_tingkat_range') then
          alter table kelas add constraint kelas_tingkat_range
            check (tingkat is null or (tingkat between 1 and 12));
        end if;
        if not exists (select 1 from pg_constraint where conname = 'kelas_nama_length') then
          alter table kelas add constraint kelas_nama_length
            check (char_length(btrim(nama)) between 1 and 40);
        end if;
      end
      $$;
    `);

    // --- ruang (counted by the Mapel column, cascades on class delete) ------
    await client.query(`
      create table if not exists ruang (
        id              serial primary key,
        tahun_ajaran_id integer references tahun_ajaran(id) on delete cascade,
        kelas_id        integer not null references kelas(id) on delete cascade,
        mapel_id        integer references mapel(id) on delete cascade,
        guru_id         text references "user"(id) on delete set null,
        deskripsi       text,
        kkm             integer not null default 75,
        bobot_tugas     integer not null default 40,
        bobot_kuis      integer not null default 40,
        bobot_kehadiran integer not null default 20,
        created_at      timestamptz not null default now(),
        updated_at      timestamptz not null default now()
      )
    `);
    await client.query(
      `create unique index if not exists ruang_scope_unique
         on ruang (tahun_ajaran_id, kelas_id, mapel_id)`,
    );

    // --- pengumuman (cascades on class delete) ------------------------------
    await client.query(`
      create table if not exists pengumuman (
        id         serial primary key,
        user_id    text references "user"(id) on delete cascade,
        judul      text not null,
        isi        text,
        sasaran    text not null default 'semua'
                     check (sasaran in ('semua', 'guru', 'siswa')),
        kelas_id   integer references kelas(id) on delete cascade,
        disematkan boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    // --- seed ---------------------------------------------------------------
    for (const j of JURUSAN) {
      await client.query(
        `insert into jurusan (kode, nama) values ($1, $2)
         on conflict (kode) do update set nama = excluded.nama`,
        [j.kode, j.nama],
      );
    }

    await client.query(
      `insert into tahun_ajaran (nama, semester, aktif) values ($1, $2, true)
       on conflict (nama) do nothing`,
      [TAHUN_AJARAN.nama, TAHUN_AJARAN.semester],
    );

    for (const m of MAPEL) {
      await client.query(
        `insert into mapel (kode, nama, kelompok) values ($1, $2, $3)
         on conflict (kode) do update set nama = excluded.nama,
                                          kelompok = excluded.kelompok`,
        [m.kode, m.nama, m.kelompok],
      );
    }

    for (const [namaKelas, kode] of Object.entries(JURUSAN_PER_KELAS)) {
      await client.query(
        `update kelas set jurusan_id = (select id from jurusan where kode = $1)
          where nama = $2`,
        [kode, namaKelas],
      );
    }

    const { rows: taRows } = await client.query<{ id: number }>(
      `select id from tahun_ajaran where nama = $1`,
      [TAHUN_AJARAN.nama],
    );
    const tahunAjaranId = taRows[0]?.id ?? null;

    let ruangBaru = 0;
    for (const [namaKelas, rooms] of Object.entries(RUANG_CONTOH)) {
      for (const [kodeMapel, nip] of rooms) {
        const { rowCount } = await client.query(
          `insert into ruang (tahun_ajaran_id, kelas_id, mapel_id, guru_id)
           select $1, k.id, m.id, (select id from "user" where username = $4)
             from kelas k, mapel m
            where k.nama = $2 and m.kode = $3
           on conflict (tahun_ajaran_id, kelas_id, mapel_id) do nothing`,
          [tahunAjaranId, namaKelas, kodeMapel, nip],
        );
        ruangBaru += rowCount ?? 0;
      }
    }

    await client.query("commit");

    const { rows: jenjangRows } = await client.query<{ nilai: string }>(
      `select nilai from pengaturan where kunci = 'jenjang'`,
    );
    const { rows: countRows } = await client.query<{ kelas: number; ruang: number }>(
      `select (select count(*)::int from kelas) as kelas,
              (select count(*)::int from ruang) as ruang`,
    );

    console.log("Migration kelas selesai.");
    console.log(`  jenjang    : ${jenjangRows[0]?.nilai ?? "(kosong)"}`);
    console.log(`  jurusan    : ${JURUSAN.length}`);
    console.log(`  mapel      : ${MAPEL.length}`);
    console.log(`  kelas      : ${countRows[0]?.kelas ?? 0}`);
    console.log(`  ruang      : ${countRows[0]?.ruang ?? 0} (${ruangBaru} baru)`);
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
