import { pool } from "@/lib/db";
import {
  bandingAlami,
  bolehKerjakan,
  bolehKirim,
  bolehUbah,
  HURUF,
  kunciTersimpan,
  nilaiPercobaan,
  pilihanTersimpan,
  type AnggotaRow,
  type DiskusiRow,
  type JadwalSlot,
  type JenisSoal,
  type KuisDetail,
  type KuisRow,
  type NilaiRow,
  type PengumpulanRow,
  type PengumpulanSiswa,
  type PercobaanRow,
  type PeranRuang,
  type PertemuanDetail,
  type PertemuanRow,
  type PertemuanSiswa,
  type PresensiMatriks,
  type RuangHeader,
  type SiswaPresensi,
  type SoalRow,
  type StatusPresensi,
  type SumberPresensi,
  type TugasDetail,
  type TugasRow,
} from "@/lib/ruang-belajar-shared";

// Server components import everything from here; the pure pieces live in
// `ruang-belajar-shared` so client tabs can use them without pulling in `pg`.
export * from "@/lib/ruang-belajar-shared";

export type AksesRuang = {
  ruang: RuangHeader;
  peran: PeranRuang;
};

type RawHeader = {
  id: number;
  kelas_id: number;
  kelas_nama: string;
  mapel_nama: string | null;
  mapel_kode: string | null;
  guru_id: string | null;
  guru_nama: string | null;
  kkm: number;
  deskripsi: string | null;
  bobot_tugas: number;
  bobot_kuis: number;
  bobot_kehadiran: number;
  ta_nama: string | null;
  ta_semester: string | null;
  jumlah_siswa: number;
};

/**
 * Resolves a room *and* the visitor's standing in it.
 *
 * Returns null when the room does not exist or the visitor has no business
 * seeing it — the page then calls `notFound()`, so a student from another class
 * cannot tell an existing room from a missing one.
 */
export async function aksesRuang(
  ruangId: number,
  user: { id: string; role: string; kelasId: number | null },
): Promise<AksesRuang | null> {
  const { rows } = await pool.query<RawHeader>(
    `select r.id,
            r.kelas_id,
            k.nama as kelas_nama,
            m.nama as mapel_nama,
            m.kode as mapel_kode,
            r.guru_id,
            u.name as guru_nama,
            r.kkm,
            r.deskripsi,
            r.bobot_tugas,
            r.bobot_kuis,
            r.bobot_kehadiran,
            t.nama as ta_nama,
            t.semester as ta_semester,
            (select count(*)::int from "user" s
              where s.role = 'siswa' and s.aktif and s.kelas_id = r.kelas_id) as jumlah_siswa
       from ruang r
       join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
       left join "user" u on u.id = r.guru_id
       left join tahun_ajaran t on t.id = r.tahun_ajaran_id
      where r.id = $1`,
    [ruangId],
  );

  const row = rows[0];
  if (!row) return null;

  let peran: PeranRuang | null = null;
  if (user.role === "admin") peran = "admin";
  else if (user.role === "guru" && row.guru_id === user.id) peran = "guru";
  else if (user.role === "siswa" && user.kelasId !== null && user.kelasId === row.kelas_id) {
    peran = "siswa";
  }
  if (!peran) return null;

  const { rows: jadwal } = await pool.query<{
    id: number;
    hari: number;
    jam_mulai: string;
    jam_selesai: string;
    link_meet: string | null;
  }>(
    `select id, hari,
            to_char(jam_mulai, 'HH24:MI') as jam_mulai,
            to_char(jam_selesai, 'HH24:MI') as jam_selesai,
            link_meet
       from jadwal where ruang_id = $1
      order by hari asc, jam_mulai asc`,
    [ruangId],
  );

  return {
    peran,
    ruang: {
      id: row.id,
      kelasId: row.kelas_id,
      kelasNama: row.kelas_nama,
      mapelNama: row.mapel_nama ?? "Tanpa mapel",
      mapelKode: row.mapel_kode ?? "—",
      guruId: row.guru_id,
      guruNama: row.guru_nama,
      kkm: row.kkm,
      deskripsi: row.deskripsi,
      bobotTugas: row.bobot_tugas,
      bobotKuis: row.bobot_kuis,
      bobotKehadiran: row.bobot_kehadiran,
      taNama: row.ta_nama ?? "—",
      taSemester: row.ta_semester ?? "—",
      jumlahSiswa: row.jumlah_siswa,
      jadwal: jadwal.map(
        (slot): JadwalSlot => ({
          id: slot.id,
          hari: slot.hari,
          jamMulai: slot.jam_mulai,
          jamSelesai: slot.jam_selesai,
          linkMeet: slot.link_meet,
        }),
      ),
    },
  };
}

/**
 * Meetings, newest first.
 *
 * Students only ever see published ones (`terbit`), which is also why the
 * "Draf" badge is a teacher-only sight.
 */
export async function listPertemuan(
  ruangId: number,
  peran: PeranRuang,
  userId: string,
): Promise<PertemuanRow[]> {
  const { rows } = await pool.query<{
    id: number;
    urutan: number;
    judul: string;
    tanggal: string;
    terbit: boolean;
    video_url: string | null;
    lampiran_nama: string | null;
    lampiran_url: string | null;
    presensi_buka: string | null;
    presensi_tutup: string | null;
    presensi_dibuka: boolean;
    tercatat: number;
    hadir: number;
    status_siswa: StatusPresensi | null;
    jumlah_selesai: number;
    selesai: boolean;
  }>(
    `select p.id,
            p.urutan,
            p.judul,
            to_char(p.tanggal, 'YYYY-MM-DD') as tanggal,
            p.terbit,
            p.video_url,
            p.lampiran_nama,
            p.lampiran_url,
            to_char(p.presensi_buka at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_buka,
            to_char(p.presensi_tutup at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_tutup,
            coalesce(now() between p.presensi_buka and p.presensi_tutup, false) as presensi_dibuka,
            (select count(*)::int from presensi pr where pr.pertemuan_id = p.id) as tercatat,
            (select count(*)::int from presensi pr
              where pr.pertemuan_id = p.id and pr.status = 'hadir') as hadir,
            (select pr.status from presensi pr
              where pr.pertemuan_id = p.id and pr.siswa_id = $2) as status_siswa,
            (select count(*)::int from materi_selesai ms
              where ms.pertemuan_id = p.id) as jumlah_selesai,
            exists(select 1 from materi_selesai ms
                    where ms.pertemuan_id = p.id and ms.siswa_id = $2) as selesai
       from pertemuan p
      where p.ruang_id = $1
        and ($3::boolean or p.terbit)
      order by p.urutan desc, p.tanggal desc`,
    [ruangId, userId, bolehUbah(peran)],
  );

  return rows.map((row) => ({
    id: row.id,
    urutan: row.urutan,
    judul: row.judul,
    tanggal: row.tanggal,
    terbit: row.terbit,
    videoUrl: row.video_url,
    lampiranNama: row.lampiran_nama,
    lampiranUrl: row.lampiran_url,
    presensiBuka: row.presensi_buka,
    presensiTutup: row.presensi_tutup,
    presensiDibuka: row.presensi_dibuka,
    presensiAda: row.tercatat > 0,
    hadir: row.hadir,
    tercatat: row.tercatat,
    jumlahSelesai: row.jumlah_selesai,
    selesai: row.selesai,
    statusSiswa: row.status_siswa,
  }));
}

export async function listTugas(
  ruangId: number,
  userId: string,
  lihatDraf: boolean,
): Promise<TugasRow[]> {
  const { rows } = await pool.query<{
    id: number;
    judul: string;
    tipe: "file" | "teks" | "keduanya";
    terbit: boolean;
    boleh_terlambat: boolean;
    tenggat: string | null;
    terkumpul: number;
    dinilai: number;
    dikumpulkan_siswa: boolean;
    nilai_siswa: number | null;
    terlambat_siswa: boolean | null;
  }>(
    `select t.id,
            t.judul,
            t.tipe,
            t.terbit,
            t.boleh_terlambat,
            to_char(t.tenggat at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as tenggat,
            (select count(*)::int from pengumpulan p
              where p.tugas_id = t.id
                and (p.teks is not null or p.file_url is not null)) as terkumpul,
            (select count(*)::int from pengumpulan p
              where p.tugas_id = t.id and p.nilai is not null) as dinilai,
            exists(select 1 from pengumpulan p
                    where p.tugas_id = t.id and p.siswa_id = $2
                      and (p.teks is not null or p.file_url is not null))
              as dikumpulkan_siswa,
            (select p.nilai from pengumpulan p
              where p.tugas_id = t.id and p.siswa_id = $2) as nilai_siswa,
            (select coalesce(p.dikumpulkan_at > t.tenggat, false)
               from pengumpulan p
              where p.tugas_id = t.id and p.siswa_id = $2) as terlambat_siswa
       from tugas t
      where t.ruang_id = $1
        and ($3::boolean or t.terbit)
      order by t.created_at desc`,
    [ruangId, userId, lihatDraf],
  );

  return rows.map((row) => ({
    id: row.id,
    judul: row.judul,
    tipe: row.tipe,
    terbit: row.terbit,
    bolehTerlambat: row.boleh_terlambat,
    tenggat: row.tenggat,
    terkumpul: row.terkumpul,
    dinilai: row.dinilai,
    // A row may exist with a grade but no answer (paper work). Either is worth
    // showing the student, so the "Tanpa jawaban" state survives the round trip.
    pengumpulanSiswa:
      row.dikumpulkan_siswa || row.nilai_siswa !== null
        ? {
            dikumpulkan: row.dikumpulkan_siswa,
            nilai: row.nilai_siswa,
            terlambat: row.terlambat_siswa ?? false,
          }
        : null,
  }));
}

/** One task, scoped to its room — an id from another room reads as missing. */
export async function getTugasDetail(
  ruangId: number,
  tugasId: number,
): Promise<TugasDetail | null> {
  const { rows } = await pool.query<{
    id: number;
    ruang_id: number;
    judul: string;
    deskripsi: string | null;
    tipe: "file" | "teks" | "keduanya";
    terbit: boolean;
    boleh_terlambat: boolean;
    tenggat: string | null;
    lewat_tenggat: boolean;
  }>(
    `select t.id,
            t.ruang_id,
            t.judul,
            t.deskripsi,
            t.tipe,
            t.terbit,
            t.boleh_terlambat,
            to_char(t.tenggat at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as tenggat,
            coalesce(t.tenggat is not null and now() > t.tenggat, false) as lewat_tenggat
       from tugas t
      where t.id = $1 and t.ruang_id = $2`,
    [tugasId, ruangId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    ruangId: row.ruang_id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    tipe: row.tipe,
    terbit: row.terbit,
    bolehTerlambat: row.boleh_terlambat,
    tenggat: row.tenggat,
    lewatTenggat: row.lewat_tenggat,
  };
}

/** Every active student of the class, with their submission if there is one. */
export async function listPengumpulan(
  tugasId: number,
  kelasId: number,
): Promise<PengumpulanRow[]> {
  const { rows } = await pool.query<{
    siswa_id: string;
    nama: string;
    nisn: string | null;
    dikumpulkan: boolean;
    dikumpulkan_at: string | null;
    teks: string | null;
    nilai: number | null;
    terlambat: boolean;
  }>(
    `select u.id as siswa_id,
            u.name as nama,
            u.username as nisn,
            (p.id is not null and (p.teks is not null or p.file_url is not null))
              as dikumpulkan,
            to_char(p.dikumpulkan_at at time zone 'Asia/Jakarta',
                    'YYYY-MM-DD HH24:MI') as dikumpulkan_at,
            p.teks,
            p.nilai,
            coalesce(p.dikumpulkan_at > t.tenggat, false) as terlambat
       from "user" u
       join tugas t on t.id = $1
       left join pengumpulan p on p.tugas_id = t.id and p.siswa_id = u.id
      where u.role = 'siswa' and u.aktif and u.kelas_id = $2
      order by u.name asc`,
    [tugasId, kelasId],
  );

  return rows.map((row) => ({
    siswaId: row.siswa_id,
    nama: row.nama,
    nisn: row.nisn,
    dikumpulkan: row.dikumpulkan,
    dikumpulkanAt: row.dikumpulkan_at,
    teks: row.teks,
    nilai: row.nilai,
    terlambat: row.terlambat,
  }));
}

/** One student's own submission, for their submit page. */
export async function getPengumpulanSiswa(
  tugasId: number,
  siswaId: string,
): Promise<PengumpulanSiswa> {
  const { rows } = await pool.query<{
    dikumpulkan: boolean;
    dikumpulkan_at: string | null;
    teks: string | null;
    nilai: number | null;
    terlambat: boolean;
  }>(
    `select (p.id is not null and (p.teks is not null or p.file_url is not null))
              as dikumpulkan,
            to_char(p.dikumpulkan_at at time zone 'Asia/Jakarta',
                    'YYYY-MM-DD HH24:MI') as dikumpulkan_at,
            p.teks,
            p.nilai,
            coalesce(p.dikumpulkan_at > t.tenggat, false) as terlambat
       from tugas t
       left join pengumpulan p on p.tugas_id = t.id and p.siswa_id = $2
      where t.id = $1`,
    [tugasId, siswaId],
  );

  const row = rows[0];
  if (!row) {
    return {
      dikumpulkan: false,
      dikumpulkanAt: null,
      teks: null,
      nilai: null,
      terlambat: false,
    };
  }

  return {
    dikumpulkan: row.dikumpulkan,
    dikumpulkanAt: row.dikumpulkan_at,
    teks: row.teks,
    nilai: row.nilai,
    terlambat: row.terlambat,
  };
}

export async function listKuis(
  ruangId: number,
  siswaId: string,
  lihatDraf: boolean,
): Promise<KuisRow[]> {
  const { rows } = await pool.query<{
    id: number;
    judul: string;
    terbit: boolean;
    durasi_menit: number;
    mulai: string | null;
    selesai: string | null;
    jumlah_soal: number;
    jumlah_percobaan: number;
    dibuka: boolean;
    lewat: boolean;
    siswa_selesai: boolean | null;
    siswa_nilai: string | null;
  }>(
    `select q.id,
            q.judul,
            q.terbit,
            q.durasi_menit,
            to_char(q.mulai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as mulai,
            to_char(q.selesai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as selesai,
            (select count(*)::int from soal s where s.kuis_id = q.id) as jumlah_soal,
            (select count(*)::int from percobaan c where c.kuis_id = q.id) as jumlah_percobaan,
            (q.mulai is null or now() >= q.mulai)
              and (q.selesai is null or now() <= q.selesai) as dibuka,
            (q.selesai is not null and now() > q.selesai) as lewat,
            c.selesai as siswa_selesai,
            c.nilai as siswa_nilai
       from kuis q
       left join percobaan c on c.kuis_id = q.id and c.siswa_id = $2
      where q.ruang_id = $1
        and ($3::boolean or q.terbit)
      order by q.created_at desc`,
    [ruangId, siswaId, lihatDraf],
  );

  return rows.map((row) => ({
    id: row.id,
    judul: row.judul,
    terbit: row.terbit,
    durasiMenit: row.durasi_menit,
    mulai: row.mulai,
    selesai: row.selesai,
    jumlahSoal: row.jumlah_soal,
    jumlahPercobaan: row.jumlah_percobaan,
    dibuka: row.dibuka,
    lewat: row.lewat,
    percobaanSiswa:
      row.siswa_selesai === null
        ? null
        : {
            selesai: row.siswa_selesai,
            nilai: row.siswa_nilai === null ? null : Number(row.siswa_nilai),
          },
  }));
}

export async function listAnggota(kelasId: number): Promise<AnggotaRow[]> {
  const { rows } = await pool.query<{
    id: string;
    nama: string;
    nisn: string | null;
    jk: "L" | "P" | null;
  }>(
    `select id, name as nama, username as nisn, jk
       from "user"
      where role = 'siswa' and aktif and kelas_id = $1
      order by name asc`,
    [kelasId],
  );
  return rows;
}

export async function listDiskusi(ruangId: number): Promise<DiskusiRow[]> {
  const { rows } = await pool.query<{
    id: number;
    isi: string;
    penulis: string;
    peran: string;
    dibuat: string;
  }>(
    `select d.id, d.isi, u.name as penulis, u.role as peran,
            to_char(d.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as dibuat
       from diskusi d
       join "user" u on u.id = d.siswa_id
      where d.ruang_id = $1
      order by d.created_at desc
      limit 100`,
    [ruangId],
  );
  return rows;
}

/** Students × meetings, plus the recorded statuses. */
export async function getPresensiMatriks(
  ruangId: number,
  kelasId: number,
): Promise<PresensiMatriks> {
  const [{ rows: pertemuan }, { rows: siswa }, { rows: status }] = await Promise.all([
    pool.query<{ id: number; urutan: number; judul: string; tanggal: string }>(
      `select id, urutan, judul, to_char(tanggal, 'YYYY-MM-DD') as tanggal
         from pertemuan where ruang_id = $1 and terbit
        order by urutan asc`,
      [ruangId],
    ),
    pool.query<{ id: string; nama: string }>(
      `select id, name as nama from "user"
        where role = 'siswa' and aktif and kelas_id = $1 order by name asc`,
      [kelasId],
    ),
    pool.query<{ pertemuan_id: number; siswa_id: string; status: StatusPresensi }>(
      `select pr.pertemuan_id, pr.siswa_id, pr.status
         from presensi pr
         join pertemuan p on p.id = pr.pertemuan_id
        where p.ruang_id = $1`,
      [ruangId],
    ),
  ]);

  const peta: Record<string, Record<string, StatusPresensi>> = {};
  for (const row of status) {
    peta[row.siswa_id] ??= {};
    peta[row.siswa_id][String(row.pertemuan_id)] = row.status;
  }

  return { pertemuan, siswa, status: peta };
}

/**
 * One meeting, scoped to its room.
 *
 * The `ruang_id` in the where clause is the access check: an id from another
 * room returns null, and the page then calls `notFound()`.
 */
export async function getPertemuanDetail(
  ruangId: number,
  pertemuanId: number,
): Promise<PertemuanDetail | null> {
  const { rows } = await pool.query<{
    id: number;
    ruang_id: number;
    urutan: number;
    judul: string;
    tanggal: string;
    terbit: boolean;
    materi: string | null;
    video_url: string | null;
    lampiran_nama: string | null;
    lampiran_url: string | null;
    presensi_buka: string | null;
    presensi_tutup: string | null;
    presensi_dibuka: boolean;
  }>(
    `select p.id,
            p.ruang_id,
            p.urutan,
            p.judul,
            to_char(p.tanggal, 'YYYY-MM-DD') as tanggal,
            p.terbit,
            p.materi,
            p.video_url,
            p.lampiran_nama,
            p.lampiran_url,
            to_char(p.presensi_buka at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_buka,
            to_char(p.presensi_tutup at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_tutup,
            coalesce(now() between p.presensi_buka and p.presensi_tutup, false) as presensi_dibuka
       from pertemuan p
      where p.id = $1 and p.ruang_id = $2`,
    [pertemuanId, ruangId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    ruangId: row.ruang_id,
    urutan: row.urutan,
    judul: row.judul,
    tanggal: row.tanggal,
    terbit: row.terbit,
    materi: row.materi,
    videoUrl: row.video_url,
    lampiranNama: row.lampiran_nama,
    lampiranUrl: row.lampiran_url,
    presensiBuka: row.presensi_buka,
    presensiTutup: row.presensi_tutup,
    presensiDibuka: row.presensi_dibuka,
  };
}

/** Every active student of the class, with this meeting's recorded status. */
export async function listPresensiSiswa(
  kelasId: number,
  pertemuanId: number,
): Promise<SiswaPresensi[]> {
  const { rows } = await pool.query<{
    id: string;
    nama: string;
    nisn: string | null;
    status: StatusPresensi | null;
  }>(
    `select u.id, u.name as nama, u.username as nisn, pr.status
       from "user" u
       left join presensi pr
              on pr.siswa_id = u.id and pr.pertemuan_id = $2
      where u.role = 'siswa' and u.aktif and u.kelas_id = $1
      order by u.name asc`,
    [kelasId, pertemuanId],
  );
  return rows;
}

/**
 * Grade components per student.
 *
 * Kehadiran is `hadir / published meetings`, so a meeting nobody has taken
 * attendance for drags the percentage down rather than being ignored — that is
 * the behaviour the report needs to be honest about.
 */
export async function getNilai(
  ruangId: number,
  kelasId: number,
): Promise<NilaiRow[]> {
  const { rows } = await pool.query<{
    id: string;
    nama: string;
    tugas: string | null;
    kuis: string | null;
    kehadiran: string | null;
  }>(
    `with siswa as (
       select id, name from "user"
        where role = 'siswa' and aktif and kelas_id = $2
     ),
     nilai_tugas as (
       select p.siswa_id, avg(p.nilai)::numeric(5,1) as nilai
         from pengumpulan p join tugas t on t.id = p.tugas_id
        where t.ruang_id = $1 and p.nilai is not null
        group by p.siswa_id
     ),
     nilai_kuis as (
       -- Only published quizzes count. A published quiz whose window has closed
       -- without an attempt scores 0 — otherwise skipping a quiz would be safer
       -- than sitting it. A quiz still running is left out entirely, so nobody
       -- is punished for one they have not reached yet.
       --
       -- A quiz with no questions is excluded outright: it cannot be sat, so
       -- scoring it would fail the whole class for a data-entry mistake.
       select h.siswa_id, avg(coalesce(h.nilai, 0))::numeric(5,1) as nilai
         from (
           select s.id as siswa_id, c.nilai
             from siswa s
             join kuis q on q.ruang_id = $1 and q.terbit
             left join percobaan c on c.kuis_id = q.id and c.siswa_id = s.id
            where (c.nilai is not null
                   or (c.id is null and q.selesai is not null and now() > q.selesai))
              and exists (select 1 from soal so where so.kuis_id = q.id)
         ) h
        group by h.siswa_id
     ),
     kehadiran as (
       select pr.siswa_id,
              count(*) filter (where pr.status = 'hadir')::int as hadir
         from presensi pr join pertemuan p on p.id = pr.pertemuan_id
        where p.ruang_id = $1
        group by pr.siswa_id
     ),
     jumlah_pertemuan as (
       select count(*)::int as n from pertemuan where ruang_id = $1 and terbit
     )
     select s.id,
            s.name as nama,
            nt.nilai as tugas,
            nk.nilai as kuis,
            case when (select n from jumlah_pertemuan) > 0
                 then round(coalesce(h.hadir, 0)::numeric * 100
                            / (select n from jumlah_pertemuan), 1)
            end as kehadiran
       from siswa s
       left join nilai_tugas nt on nt.siswa_id = s.id
       left join nilai_kuis nk on nk.siswa_id = s.id
       left join kehadiran h on h.siswa_id = s.id
      order by s.name asc`,
    [ruangId, kelasId],
  );

  return rows.map((row) => ({
    siswaId: row.id,
    nama: row.nama,
    tugas: row.tugas === null ? null : Number(row.tugas),
    kuis: row.kuis === null ? null : Number(row.kuis),
    kehadiran: row.kehadiran === null ? null : Number(row.kehadiran),
  }));
}

/** The rooms a teacher is assigned to, for the Ruang Belajar index. */
export async function listRuangGuru(guruId: string) {
  return daftarRuang(`r.guru_id = $1`, [guruId]);
}

/**
 * The rooms of one class, for a student's index.
 *
 * Counts published work only. A card that says "3 pertemuan" while the Materi
 * tab shows two is the card lying, not the tab: a student cannot open a draft,
 * so a draft is not part of what they have.
 */
export async function listRuangKelas(kelasId: number) {
  return daftarRuang(`r.kelas_id = $1`, [kelasId], true);
}

export type RingkasRuang = {
  id: number;
  kelas_nama: string;
  mapel_nama: string | null;
  mapel_kode: string | null;
  guru_nama: string | null;
  pertemuan: number;
  tugas: number;
  kuis: number;
  siswa: number;
  jadwal: string | null;
};

async function daftarRuang(
  kondisi: string,
  params: unknown[],
  /** Restricts the three counters to published rows (the student's view). */
  hanyaTerbit = false,
): Promise<RingkasRuang[]> {
  // The flag rides in as the next positional parameter rather than being
  // spliced into the SQL string, so the callers' own `$n` stay untouched.
  const terbit = `$${params.length + 1}::boolean`;

  const { rows } = await pool.query<RingkasRuang>(
    `select r.id,
            k.nama as kelas_nama,
            m.nama as mapel_nama,
            m.kode as mapel_kode,
            u.name as guru_nama,
            (select count(*)::int from pertemuan p
              where p.ruang_id = r.id and (${terbit} or p.terbit)) as pertemuan,
            (select count(*)::int from tugas t
              where t.ruang_id = r.id and (${terbit} or t.terbit)) as tugas,
            (select count(*)::int from kuis q
              where q.ruang_id = r.id and (${terbit} or q.terbit)) as kuis,
            (select count(*)::int from "user" s
              where s.role = 'siswa' and s.aktif and s.kelas_id = r.kelas_id) as siswa,
            (select string_agg(to_char(j.jam_mulai, 'HH24:MI') || '–' ||
                               to_char(j.jam_selesai, 'HH24:MI'), ', '
                               order by j.hari, j.jam_mulai)
               from jadwal j where j.ruang_id = r.id) as jadwal
       from ruang r
       join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
       left join "user" u on u.id = r.guru_id
      where ${kondisi}
      order by k.nama asc, m.nama asc, r.id asc`,
    [...params, hanyaTerbit],
  );

  // The index is read class by class, so "X 2" has to come before "X 10".
  rows.sort(
    (a, b) =>
      bandingAlami(a.kelas_nama, b.kelas_nama) ||
      bandingAlami(a.mapel_nama, b.mapel_nama) ||
      a.id - b.id,
  );

  return rows;
}

/** One task a student still owes, flattened across every room of their class. */
export type TugasMenunggu = {
  id: number;
  ruangId: number;
  judul: string;
  mapel: string | null;
  kelas: string;
  /** `YYYY-MM-DD HH24:MI` in Asia/Jakarta, or null for "no deadline". */
  tenggat: string | null;
  lewat: boolean;
};

/**
 * The student's outstanding work, soonest deadline first.
 *
 * "Outstanding" means no answer and no grade. A task the teacher graded without
 * an online submission is finished business, not a reminder — the student has a
 * number for it already.
 */
export async function listTugasMenunggu(
  kelasId: number,
  siswaId: string,
): Promise<TugasMenunggu[]> {
  const { rows } = await pool.query<{
    id: number;
    ruang_id: number;
    judul: string;
    mapel: string | null;
    kelas: string;
    tenggat: string | null;
    lewat: boolean;
  }>(
    `select t.id, t.ruang_id, t.judul,
            m.nama as mapel, k.nama as kelas,
            to_char(t.tenggat at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as tenggat,
            coalesce(t.tenggat is not null and now() > t.tenggat, false) as lewat
       from tugas t
       join ruang r on r.id = t.ruang_id
       join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
       left join pengumpulan p on p.tugas_id = t.id and p.siswa_id = $2
      where r.kelas_id = $1
        and t.terbit
        and (p.id is null
             or (p.nilai is null and p.teks is null and p.file_url is null))
      order by t.tenggat asc nulls last, t.id desc`,
    [kelasId, siswaId],
  );

  return rows.map((row) => ({
    id: row.id,
    ruangId: row.ruang_id,
    judul: row.judul,
    mapel: row.mapel,
    kelas: row.kelas,
    tenggat: row.tenggat,
    lewat: row.lewat,
  }));
}

// ------------------------------------------------------------------ mutations

export type Hasil = { ok: true } | { ok: false; error: string };

export async function tambahPertemuan({
  ruangId,
  judul,
  tanggal,
  terbit,
  materi,
  videoUrl,
  presensiBuka,
  presensiTutup,
}: {
  ruangId: number;
  judul: string;
  tanggal: string;
  terbit: boolean;
  materi: string | null;
  videoUrl: string | null;
  presensiBuka: string | null;
  presensiTutup: string | null;
}): Promise<Hasil> {
  const { rows } = await pool.query<{ next: number }>(
    `select coalesce(max(urutan), 0) + 1 as next from pertemuan where ruang_id = $1`,
    [ruangId],
  );

  await pool.query(
    `insert into pertemuan
       (ruang_id, urutan, judul, tanggal, terbit, materi, video_url,
        presensi_buka, presensi_tutup)
     values ($1, $2, $3, $4::date, $5, $6, $7,
             case when $8::text is null then null
                  else ($4::date + $8::time) at time zone 'Asia/Jakarta' end,
             case when $9::text is null then null
                  else ($4::date + $9::time) at time zone 'Asia/Jakarta' end)`,
    [
      ruangId,
      rows[0].next,
      judul,
      tanggal,
      terbit,
      materi,
      videoUrl,
      presensiBuka,
      presensiTutup,
    ],
  );

  return { ok: true };
}

/**
 * Writes the material body of one meeting.
 *
 * Scoped by `ruang_id` in the `where`, so a meeting id borrowed from another
 * room updates nothing and reports "not found" rather than silently editing a
 * stranger's meeting. An empty string is stored as null: blank is absence, not
 * an empty paragraph.
 */
export async function simpanMateri({
  ruangId,
  pertemuanId,
  materi,
}: {
  ruangId: number;
  pertemuanId: number;
  materi: string | null;
}): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `update pertemuan set materi = $3 where id = $1 and ruang_id = $2`,
    [pertemuanId, ruangId, materi],
  );

  if (!rowCount) return { ok: false, error: "Pertemuan tidak ditemukan di ruang ini." };
  return { ok: true };
}

export async function tambahTugas({
  ruangId,
  judul,
  tenggat,
  tipe,
  bolehTerlambat,
  terbit,
}: {
  ruangId: number;
  judul: string;
  tenggat: string | null;
  tipe: "file" | "teks" | "keduanya";
  bolehTerlambat: boolean;
  terbit: boolean;
}): Promise<Hasil> {
  await pool.query(
    `insert into tugas (ruang_id, judul, tenggat, tipe, boleh_terlambat, terbit)
     values ($1, $2,
             case when $3::text is null then null
                  else ($3::text)::timestamp at time zone 'Asia/Jakarta' end,
             $4, $5, $6)`,
    [ruangId, judul, tenggat, tipe, bolehTerlambat, terbit],
  );
  return { ok: true };
}

export async function tambahKuis({
  ruangId,
  judul,
  mulai,
  selesai,
  durasiMenit,
  terbit,
}: {
  ruangId: number;
  judul: string;
  mulai: string | null;
  selesai: string | null;
  durasiMenit: number;
  terbit: boolean;
}): Promise<Hasil> {
  await pool.query(
    `insert into kuis (ruang_id, judul, mulai, selesai, durasi_menit, terbit)
     values ($1, $2,
             case when $3::text is null then null
                  else ($3::text)::timestamp at time zone 'Asia/Jakarta' end,
             case when $4::text is null then null
                  else ($4::text)::timestamp at time zone 'Asia/Jakarta' end,
             $5, $6)`,
    [ruangId, judul, mulai, selesai, durasiMenit, terbit],
  );
  return { ok: true };
}

export async function simpanPengaturan({
  ruangId,
  deskripsi,
  kkm,
  bobotTugas,
  bobotKuis,
  bobotKehadiran,
}: {
  ruangId: number;
  deskripsi: string | null;
  kkm: number;
  bobotTugas: number;
  bobotKuis: number;
  bobotKehadiran: number;
}): Promise<Hasil> {
  if (bobotTugas + bobotKuis + bobotKehadiran !== 100) {
    return { ok: false, error: "Total bobot harus 100." };
  }

  await pool.query(
    `update ruang
        set deskripsi = $2,
            kkm = $3,
            bobot_tugas = $4,
            bobot_kuis = $5,
            bobot_kehadiran = $6,
            updated_at = now()
      where id = $1`,
    [ruangId, deskripsi, kkm, bobotTugas, bobotKuis, bobotKehadiran],
  );
  return { ok: true };
}

export async function simpanMeet({
  ruangId,
  jadwalId,
  linkMeet,
}: {
  ruangId: number;
  jadwalId: number;
  linkMeet: string | null;
}): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `update jadwal set link_meet = $3, updated_at = now()
      where id = $1 and ruang_id = $2`,
    [jadwalId, ruangId, linkMeet],
  );
  if (rowCount === 0) return { ok: false, error: "Jadwal tidak ditemukan." };
  return { ok: true };
}

export async function kirimDiskusi({
  ruangId,
  userId,
  isi,
}: {
  ruangId: number;
  userId: string;
  isi: string;
}): Promise<Hasil> {
  await pool.query(
    `insert into diskusi (ruang_id, siswa_id, isi) values ($1, $2, $3)`,
    [ruangId, userId, isi],
  );
  return { ok: true };
}

/**
 * Writes the teacher's attendance sheet in one go.
 *
 * A `null` status means "clear this row", which deletes it — an empty cell and a
 * missing row are the same thing everywhere else in the app. The insert joins
 * `"user"` on the class, so an id from another class is silently dropped rather
 * than written.
 */
export async function simpanPresensi({
  ruangId,
  pertemuanId,
  kelasId,
  entri,
}: {
  ruangId: number;
  pertemuanId: number;
  kelasId: number;
  entri: { siswaId: string; status: StatusPresensi | null }[];
}): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `select 1 from pertemuan where id = $1 and ruang_id = $2`,
    [pertemuanId, ruangId],
  );
  if (rowCount === 0) return { ok: false, error: "Pertemuan tidak ditemukan." };
  if (entri.length === 0) return { ok: true };

  const hapus = entri.filter((item) => item.status === null).map((item) => item.siswaId);
  const isi = entri.filter(
    (item): item is { siswaId: string; status: StatusPresensi } => item.status !== null,
  );

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (hapus.length > 0) {
      await client.query(
        `delete from presensi
          where pertemuan_id = $1 and siswa_id = any($2::text[])`,
        [pertemuanId, hapus],
      );
    }

    if (isi.length > 0) {
      await client.query(
        `insert into presensi (pertemuan_id, siswa_id, status)
         select $1, u.id, v.status
           from unnest($2::text[], $3::text[]) as v(siswa_id, status)
           join "user" u on u.id = v.siswa_id
          where u.role = 'siswa' and u.aktif and u.kelas_id = $4
         on conflict (pertemuan_id, siswa_id)
         do update set status = excluded.status, dicatat_at = now()`,
        [pertemuanId, isi.map((i) => i.siswaId), isi.map((i) => i.status), kelasId],
      );
    }

    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * One meeting as the student in it sees it.
 *
 * Drafts are not filtered here — the page decides, because a teacher's sheet
 * and a student's page want different answers to the same row. Everything else
 * is scoped by `ruang_id`, so a meeting id from another room reads as missing.
 */
export async function getPertemuanSiswa({
  ruangId,
  pertemuanId,
  siswaId,
  kelasId,
}: {
  ruangId: number;
  pertemuanId: number;
  siswaId: string;
  kelasId: number;
}): Promise<PertemuanSiswa | null> {
  const { rows } = await pool.query<{
    id: number;
    ruang_id: number;
    urutan: number;
    judul: string;
    tanggal: string;
    terbit: boolean;
    materi: string | null;
    video_url: string | null;
    lampiran_nama: string | null;
    lampiran_url: string | null;
    presensi_buka: string | null;
    presensi_tutup: string | null;
    presensi_dibuka: boolean;
    status_siswa: StatusPresensi | null;
    sumber_siswa: SumberPresensi | null;
    selesai: boolean;
    hadir: number;
    jumlah_siswa: number;
  }>(
    `select p.id, p.ruang_id, p.urutan, p.judul,
            to_char(p.tanggal, 'YYYY-MM-DD') as tanggal,
            p.terbit, p.materi, p.video_url, p.lampiran_nama, p.lampiran_url,
            to_char(p.presensi_buka at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_buka,
            to_char(p.presensi_tutup at time zone 'Asia/Jakarta', 'HH24:MI') as presensi_tutup,
            coalesce(now() between p.presensi_buka and p.presensi_tutup, false) as presensi_dibuka,
            pr.status as status_siswa,
            pr.sumber as sumber_siswa,
            exists(select 1 from materi_selesai ms
                    where ms.pertemuan_id = p.id and ms.siswa_id = $3) as selesai,
            (select count(*)::int from presensi x
              where x.pertemuan_id = p.id and x.status = 'hadir') as hadir,
            (select count(*)::int from "user" u
              where u.role = 'siswa' and u.aktif and u.kelas_id = $4) as jumlah_siswa
       from pertemuan p
       left join presensi pr on pr.pertemuan_id = p.id and pr.siswa_id = $3
      where p.id = $1 and p.ruang_id = $2`,
    [pertemuanId, ruangId, siswaId, kelasId],
  );

  const row = rows[0];
  if (!row) return null;

  // Neighbours are looked up among published meetings only: a student walking
  // "berikutnya" must never land on a draft the list does not show.
  const { rows: tetangga } = await pool.query<{
    arah: "sebelumnya" | "berikutnya";
    id: number;
    urutan: number;
    judul: string;
  }>(
    `(select 'sebelumnya'::text as arah, id, urutan, judul
        from pertemuan
       where ruang_id = $1 and terbit and (urutan, id) < ($2::int, $3::int)
       order by urutan desc, id desc
       limit 1)
     union all
     (select 'berikutnya'::text as arah, id, urutan, judul
        from pertemuan
       where ruang_id = $1 and terbit and (urutan, id) > ($2::int, $3::int)
       order by urutan asc, id asc
       limit 1)`,
    [ruangId, row.urutan, row.id],
  );

  const cari = (arah: "sebelumnya" | "berikutnya") => {
    const ketemu = tetangga.find((item) => item.arah === arah);
    return ketemu ? { id: ketemu.id, urutan: ketemu.urutan, judul: ketemu.judul } : null;
  };

  return {
    id: row.id,
    ruangId: row.ruang_id,
    urutan: row.urutan,
    judul: row.judul,
    tanggal: row.tanggal,
    terbit: row.terbit,
    materi: row.materi,
    videoUrl: row.video_url,
    lampiranNama: row.lampiran_nama,
    lampiranUrl: row.lampiran_url,
    presensiBuka: row.presensi_buka,
    presensiTutup: row.presensi_tutup,
    presensiDibuka: row.presensi_dibuka,
    statusSiswa: row.status_siswa,
    sumberSiswa: row.sumber_siswa,
    selesai: row.selesai,
    hadir: row.hadir,
    jumlahSiswa: row.jumlah_siswa,
    sebelumnya: cari("sebelumnya"),
    berikutnya: cari("berikutnya"),
  };
}

/**
 * A student recording their own attendance.
 *
 * The window and the "the teacher's word is final" rule are enforced here, in
 * SQL, not taken from the page — this is the write path, and it has to be able
 * to refuse on its own. `sumber = 'guru'` in the conflict clause is the whole
 * guard: a row the teacher wrote simply does not match, so the update is
 * skipped and `rowCount` comes back 0.
 */
export async function catatPresensiSendiri({
  ruangId,
  pertemuanId,
  siswaId,
  kelasId,
  status,
}: {
  ruangId: number;
  pertemuanId: number;
  siswaId: string;
  kelasId: number;
  status: StatusPresensi;
}): Promise<Hasil> {
  const { rows } = await pool.query<{
    terbit: boolean;
    dibuka: boolean;
    sumber: SumberPresensi | null;
  }>(
    `select p.terbit,
            coalesce(now() between p.presensi_buka and p.presensi_tutup, false) as dibuka,
            pr.sumber
       from pertemuan p
       left join presensi pr on pr.pertemuan_id = p.id and pr.siswa_id = $3
      where p.id = $1 and p.ruang_id = $2`,
    [pertemuanId, ruangId, siswaId],
  );

  const row = rows[0];
  if (!row) return { ok: false, error: "Pertemuan tidak ditemukan." };
  if (!row.terbit) return { ok: false, error: "Pertemuan ini belum diterbitkan." };
  if (!row.dibuka) {
    return { ok: false, error: "Jendela presensi untuk pertemuan ini sudah ditutup." };
  }
  if (row.sumber === "guru") {
    return {
      ok: false,
      error:
        "Guru sudah mengisi presensi Anda untuk pertemuan ini. Hubungi guru kalau ada yang keliru.",
    };
  }

  const { rowCount } = await pool.query(
    `insert into presensi (pertemuan_id, siswa_id, status, sumber)
     select p.id, u.id, $3, 'siswa'
       from pertemuan p
       join "user" u on u.id = $2
      where p.id = $1
        and p.ruang_id = $4
        and p.terbit
        and now() between p.presensi_buka and p.presensi_tutup
        and u.role = 'siswa' and u.aktif and u.kelas_id = $5
     on conflict (pertemuan_id, siswa_id)
     do update set status = excluded.status, sumber = 'siswa', dicatat_at = now()
     where presensi.sumber = 'siswa'`,
    [pertemuanId, siswaId, status, ruangId, kelasId],
  );

  // Either the student is not in this class, the window closed mid-request, or
  // the teacher wrote in the meantime. All three mean "not written".
  if (rowCount === 0) {
    return {
      ok: false,
      error: "Presensi tidak bisa disimpan. Muat ulang halaman lalu coba lagi.",
    };
  }
  return { ok: true };
}

/**
 * "Sudah dipelajari" — the student's own bookmark on a meeting.
 *
 * It is not a grade and not attendance; it is the one bit of state a student
 * owns outright, so it can be set and unset at any time, before or after the
 * attendance window.
 */
export async function tandaiSelesai({
  ruangId,
  pertemuanId,
  siswaId,
  kelasId,
  selesai,
}: {
  ruangId: number;
  pertemuanId: number;
  siswaId: string;
  kelasId: number;
  selesai: boolean;
}): Promise<Hasil> {
  if (!selesai) {
    await pool.query(
      `delete from materi_selesai ms
        using pertemuan p
        where ms.pertemuan_id = $1
          and ms.siswa_id = $2
          and p.id = ms.pertemuan_id
          and p.ruang_id = $3`,
      [pertemuanId, siswaId, ruangId],
    );
    // Removing a mark that is not there is not a failure — the desired state
    // is the state either way.
    return { ok: true };
  }

  const { rowCount } = await pool.query(
    `insert into materi_selesai (pertemuan_id, siswa_id)
     select p.id, u.id
       from pertemuan p
       join "user" u on u.id = $2
      where p.id = $1
        and p.ruang_id = $3
        and p.terbit
        and u.role = 'siswa' and u.aktif and u.kelas_id = $4
     on conflict (pertemuan_id, siswa_id) do nothing`,
    [pertemuanId, siswaId, ruangId, kelasId],
  );

  if (rowCount === 0) {
    // Already marked is fine; not being in the class is not. One extra read
    // tells the two apart instead of reporting a false failure.
    const { rows } = await pool.query<{ n: number }>(
      `select count(*)::int as n from materi_selesai
        where pertemuan_id = $1 and siswa_id = $2`,
      [pertemuanId, siswaId],
    );
    if (rows[0].n === 0) {
      return { ok: false, error: "Pertemuan ini tidak bisa ditandai." };
    }
  }
  return { ok: true };
}

/**
 * A student's answer to a task.
 *
 * The deadline rule lives in `bolehKirim`, shared with the page, so the button
 * and the database agree. `dikumpulkan_at` moves on every re-submission, which is
 * what makes the "Terlambat" flag honest.
 */
export async function simpanPengumpulan({
  ruangId,
  tugasId,
  siswaId,
  kelasId,
  teks,
}: {
  ruangId: number;
  tugasId: number;
  siswaId: string;
  kelasId: number;
  teks: string;
}): Promise<Hasil> {
  const { rows } = await pool.query<{
    terbit: boolean;
    boleh_terlambat: boolean;
    lewat: boolean;
    nilai: number | null;
    kelas: number | null;
  }>(
    `select t.terbit,
            t.boleh_terlambat,
            coalesce(t.tenggat is not null and now() > t.tenggat, false) as lewat,
            (select p.nilai from pengumpulan p
              where p.tugas_id = t.id and p.siswa_id = $3) as nilai,
            (select u.kelas_id from "user" u
              where u.id = $3 and u.role = 'siswa' and u.aktif) as kelas
       from tugas t
      where t.id = $1 and t.ruang_id = $2`,
    [tugasId, ruangId, siswaId],
  );

  const row = rows[0];
  if (!row) return { ok: false, error: "Tugas tidak ditemukan." };
  if (row.kelas !== kelasId) {
    return { ok: false, error: "Anda bukan siswa kelas ini." };
  }

  const cek = bolehKirim(
    {
      terbit: row.terbit,
      bolehTerlambat: row.boleh_terlambat,
      lewatTenggat: row.lewat,
    },
    { nilai: row.nilai },
  );
  if (!cek.ok) return { ok: false, error: cek.alasan };

  await pool.query(
    `insert into pengumpulan (tugas_id, siswa_id, teks)
     values ($1, $2, $3)
     on conflict (tugas_id, siswa_id)
     do update set teks = excluded.teks, dikumpulkan_at = now()`,
    [tugasId, siswaId, teks],
  );

  return { ok: true };
}

/**
 * Grades, in one go.
 *
 * A grade can be written for a student who never sent anything online — school
 * work still arrives on paper. Such a row stores the grade with no answer, and
 * every read treats "dikumpulkan" as "an answer exists", so it is never counted
 * as a submission. Clearing that grade again removes the empty row.
 */
export async function simpanNilaiTugas({
  ruangId,
  tugasId,
  kelasId,
  entri,
}: {
  ruangId: number;
  tugasId: number;
  kelasId: number;
  entri: { siswaId: string; nilai: number | null }[];
}): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `select 1 from tugas where id = $1 and ruang_id = $2`,
    [tugasId, ruangId],
  );
  if (rowCount === 0) return { ok: false, error: "Tugas tidak ditemukan." };
  if (entri.length === 0) return { ok: true };

  const isi = entri.filter(
    (item): item is { siswaId: string; nilai: number } => item.nilai !== null,
  );
  const kosong = entri.filter((item) => item.nilai === null).map((item) => item.siswaId);

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (kosong.length > 0) {
      await client.query(
        `update pengumpulan set nilai = null
          where tugas_id = $1 and siswa_id = any($2::text[])`,
        [tugasId, kosong],
      );
    }

    if (isi.length > 0) {
      // The join on the class means a forged student id writes nothing.
      await client.query(
        `insert into pengumpulan (tugas_id, siswa_id, nilai)
         select $1, u.id, v.nilai
           from unnest($2::text[], $3::int[]) as v(siswa_id, nilai)
           join "user" u on u.id = v.siswa_id
          where u.role = 'siswa' and u.aktif and u.kelas_id = $4
         on conflict (tugas_id, siswa_id)
         do update set nilai = excluded.nilai`,
        [tugasId, isi.map((i) => i.siswaId), isi.map((i) => i.nilai), kelasId],
      );
    }

    // A row with neither an answer nor a grade carries no information.
    await client.query(
      `delete from pengumpulan
        where tugas_id = $1 and nilai is null
          and teks is null and file_url is null`,
      [tugasId],
    );

    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------------- kuis

/** The frozen order a student sees: question ids, and the options per question. */
export type UrutanSoal = {
  soal: number[];
  opsi: Record<string, string[]>;
};

export type PercobaanSiswa = {
  id: number;
  selesai: boolean;
  /** `28 Okt 2026 13.28`, or null. */
  mulai: string | null;
  dikumpulkan: string | null;
  /** Seconds left on this student's own clock, or null when there is no limit. */
  sisaDetik: number | null;
  nilai: number | null;
  jawaban: Record<string, string>;
  nilaiEsai: Record<string, number>;
  urutan: UrutanSoal | null;
};

/** Reads `jsonb` that may be null or an unexpected shape. */
function objek<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  return fallback;
}

export async function getKuisDetail(
  ruangId: number,
  kuisId: number,
): Promise<KuisDetail | null> {
  const { rows } = await pool.query<{
    id: number;
    ruang_id: number;
    judul: string;
    petunjuk: string | null;
    mulai: string | null;
    selesai: string | null;
    durasi_menit: number;
    acak_soal: boolean;
    acak_opsi: boolean;
    tampilkan_nilai: boolean;
    terbit: boolean;
    jumlah_soal: number;
    total_bobot: number;
    jumlah_esai: number;
    dibuka: boolean;
    lewat: boolean;
  }>(
    `select q.id, q.ruang_id, q.judul, q.petunjuk,
            to_char(q.mulai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as mulai,
            to_char(q.selesai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as selesai,
            q.durasi_menit, q.acak_soal, q.acak_opsi, q.tampilkan_nilai, q.terbit,
            (select count(*)::int from soal s where s.kuis_id = q.id) as jumlah_soal,
            (select coalesce(sum(s.bobot), 0)::int from soal s where s.kuis_id = q.id) as total_bobot,
            (select count(*)::int from soal s
              where s.kuis_id = q.id and s.jenis = 'esai') as jumlah_esai,
            (q.mulai is null or now() >= q.mulai)
              and (q.selesai is null or now() <= q.selesai) as dibuka,
            (q.selesai is not null and now() > q.selesai) as lewat
       from kuis q
      where q.id = $1 and q.ruang_id = $2`,
    [kuisId, ruangId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    ruangId: row.ruang_id,
    judul: row.judul,
    petunjuk: row.petunjuk,
    mulai: row.mulai,
    selesai: row.selesai,
    durasiMenit: row.durasi_menit,
    acakSoal: row.acak_soal,
    acakOpsi: row.acak_opsi,
    tampilkanNilai: row.tampilkan_nilai,
    terbit: row.terbit,
    jumlahSoal: row.jumlah_soal,
    totalBobot: row.total_bobot,
    jumlahEsai: row.jumlah_esai,
    dibuka: row.dibuka,
    lewat: row.lewat,
  };
}

export async function listSoal(kuisId: number): Promise<SoalRow[]> {
  const { rows } = await pool.query<{
    id: number;
    urutan: number;
    jenis: JenisSoal;
    pertanyaan: string;
    pilihan: unknown;
    jawaban: string | null;
    bobot: number;
    bank_soal_id: number | null;
    beda: boolean;
  }>(
    // `beda` answers "is this snapshot older than the bank?", which is what the
    // Sinkronkan button keys off. Null bank rows are never stale: they were
    // written straight into the quiz.
    `select s.id, s.urutan, s.jenis, s.pertanyaan, s.pilihan, s.jawaban, s.bobot,
            s.bank_soal_id,
            coalesce(b.pertanyaan <> s.pertanyaan
                     or coalesce(b.pilihan, '{}'::jsonb)
                        is distinct from coalesce(s.pilihan, '{}'::jsonb)
                     or b.jawaban is distinct from s.jawaban
                     or b.jenis <> s.jenis
                     or b.bobot <> s.bobot, false) as beda
       from soal s
       left join bank_soal b on b.id = s.bank_soal_id
      where s.kuis_id = $1
      order by s.urutan asc, s.id asc`,
    [kuisId],
  );

  return rows.map((row) => ({
    id: row.id,
    urutan: row.urutan,
    jenis: row.jenis,
    pertanyaan: row.pertanyaan,
    pilihan: pilihanTersimpan(row.pilihan),
    jawaban: kunciTersimpan(row.pilihan, row.jawaban),
    bobot: row.bobot,
    bankSoalId: row.bank_soal_id,
    bedaDariBank: row.beda,
  }));
}

/** Every student in the class, with their attempt if they made one. */
export async function listPercobaan(
  kuisId: number,
  kelasId: number,
): Promise<PercobaanRow[]> {
  const { rows } = await pool.query<{
    siswa_id: string;
    nama: string;
    nisn: string | null;
    ada: boolean;
    selesai: boolean;
    mulai: string | null;
    dikumpulkan: string | null;
    nilai: string | null;
    perlu_koreksi: number;
  }>(
    `select u.id as siswa_id, u.name as nama, u.username as nisn,
            c.id is not null as ada,
            coalesce(c.selesai is not null, false) as selesai,
            to_char(c.mulai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as mulai,
            to_char(c.selesai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as dikumpulkan,
            c.nilai,
            case when c.id is null then 0
                 else (select count(*)::int from soal s
                        where s.kuis_id = $1 and s.jenis = 'esai'
                          and (c.nilai_esai is null
                               or c.nilai_esai->>s.id::text is null))
            end as perlu_koreksi
       from "user" u
       left join percobaan c on c.siswa_id = u.id and c.kuis_id = $1
      where u.role = 'siswa' and u.aktif and u.kelas_id = $2
      order by u.name asc`,
    [kuisId, kelasId],
  );

  return rows.map((row) => ({
    siswaId: row.siswa_id,
    nama: row.nama,
    nisn: row.nisn,
    ada: row.ada,
    selesai: row.selesai,
    mulai: row.mulai,
    dikumpulkan: row.dikumpulkan,
    // `numeric` comes back as a string; the page wants a number.
    nilai: row.nilai === null ? null : Number(row.nilai),
    perluKoreksi: row.perlu_koreksi,
  }));
}

export async function getPercobaanSiswa(
  kuisId: number,
  siswaId: string,
): Promise<PercobaanSiswa | null> {
  const { rows } = await pool.query<{
    id: number;
    selesai: boolean;
    mulai: string | null;
    dikumpulkan: string | null;
    sisa_detik: number | null;
    nilai: string | null;
    jawaban: unknown;
    nilai_esai: unknown;
    urutan_soal: unknown;
  }>(
    `select c.id,
            c.selesai is not null as selesai,
            to_char(c.mulai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as mulai,
            to_char(c.selesai at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as dikumpulkan,
            case when c.batas_at is null and q.selesai is null then null
                 else greatest(0, floor(extract(epoch from (
                        least(coalesce(c.batas_at, 'infinity'::timestamptz),
                              coalesce(q.selesai, 'infinity'::timestamptz)) - now()))))::int
            end as sisa_detik,
            c.nilai, c.jawaban, c.nilai_esai, c.urutan_soal
       from percobaan c
       join kuis q on q.id = c.kuis_id
      where c.kuis_id = $1 and c.siswa_id = $2`,
    [kuisId, siswaId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    selesai: row.selesai,
    mulai: row.mulai,
    dikumpulkan: row.dikumpulkan,
    sisaDetik: row.sisa_detik,
    nilai: row.nilai === null ? null : Number(row.nilai),
    jawaban: objek<Record<string, string>>(row.jawaban, {}),
    nilaiEsai: objek<Record<string, number>>(row.nilai_esai, {}),
    urutan: objek<UrutanSoal | null>(row.urutan_soal, null),
  };
}

/** Every collected attempt, with what was written and what was scored by hand. */
export async function listJawabanPercobaan(
  kuisId: number,
): Promise<
  { siswaId: string; jawaban: Record<string, string>; nilaiEsai: Record<string, number> }[]
> {
  const { rows } = await pool.query<{
    siswa_id: string;
    jawaban: unknown;
    nilai_esai: unknown;
  }>(
    `select siswa_id, jawaban, nilai_esai from percobaan
      where kuis_id = $1 and selesai is not null`,
    [kuisId],
  );
  return rows.map((row) => ({
    siswaId: row.siswa_id,
    jawaban: objek<Record<string, string>>(row.jawaban, {}),
    nilaiEsai: objek<Record<string, number>>(row.nilai_esai, {}),
  }));
}

/**
 * Recomputes every collected attempt from the questions as they are *now*.
 *
 * Called after a question is added, edited or deleted: without it a student who
 * answered before the change would keep a score that no longer matches the quiz
 * they sat. The score itself comes from `nilaiPercobaan`, the same helper the
 * submit action uses, so there is only ever one definition of a score.
 */
export async function hitungUlangPercobaan(kuisId: number): Promise<void> {
  const soal = await listSoal(kuisId);
  const { rows } = await pool.query<{
    id: number;
    jawaban: unknown;
    nilai_esai: unknown;
  }>(`select id, jawaban, nilai_esai from percobaan where kuis_id = $1`, [kuisId]);

  for (const row of rows) {
    const nilai = nilaiPercobaan(
      soal,
      objek<Record<string, string>>(row.jawaban, {}),
      objek<Record<string, number>>(row.nilai_esai, {}),
    );
    await pool.query(`update percobaan set nilai = $2 where id = $1`, [row.id, nilai]);
  }
}

export async function simpanKuis({
  ruangId,
  kuisId,
  judul,
  petunjuk,
  mulai,
  selesai,
  durasiMenit,
  acakSoal,
  acakOpsi,
  tampilkanNilai,
  terbit,
}: {
  ruangId: number;
  kuisId: number;
  judul: string;
  petunjuk: string | null;
  mulai: string | null;
  selesai: string | null;
  durasiMenit: number;
  acakSoal: boolean;
  acakOpsi: boolean;
  tampilkanNilai: boolean;
  terbit: boolean;
}): Promise<Hasil> {
  // Publishing with nothing to answer would put an empty quiz in front of the
  // class and a 0 in the grade book.
  if (terbit) {
    const { rows } = await pool.query<{ n: number }>(
      `select count(*)::int as n from soal where kuis_id = $1`,
      [kuisId],
    );
    if (rows[0].n === 0) {
      return { ok: false, error: "Tambahkan minimal satu soal sebelum menerbitkan." };
    }
  }

  const { rowCount } = await pool.query(
    `update kuis
        set judul = $3,
            petunjuk = $4,
            mulai = case when $5::text is null then null
                         else ($5::text)::timestamp at time zone 'Asia/Jakarta' end,
            selesai = case when $6::text is null then null
                           else ($6::text)::timestamp at time zone 'Asia/Jakarta' end,
            durasi_menit = $7,
            acak_soal = $8,
            acak_opsi = $9,
            tampilkan_nilai = $10,
            terbit = $11,
            updated_at = now()
      where id = $2 and ruang_id = $1`,
    [
      ruangId,
      kuisId,
      judul,
      petunjuk,
      mulai,
      selesai,
      durasiMenit,
      acakSoal,
      acakOpsi,
      tampilkanNilai,
      terbit,
    ],
  );
  if (rowCount === 0) return { ok: false, error: "Kuis tidak ditemukan." };
  return { ok: true };
}

type SoalMasuk = {
  jenis: JenisSoal;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  bobot: number;
};

function rapikanPilihan(pilihan: Record<string, string>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const huruf of HURUF) {
    const isi = String(pilihan[huruf] ?? "").trim();
    if (isi) hasil[huruf] = isi;
  }
  return hasil;
}

/** Appends one question at the end, then re-scores every attempt. */
export async function tambahSoal(
  kuisId: number,
  soal: SoalMasuk,
  bankSoalId: number | null = null,
): Promise<Hasil & { id?: number }> {
  const pilihan = soal.jenis === "pg" ? rapikanPilihan(soal.pilihan) : {};
  const { rows } = await pool.query<{ urutan: number }>(
    `select coalesce(max(urutan), 0)::int as urutan from soal where kuis_id = $1`,
    [kuisId],
  );

  const { rows: dibuat } = await pool.query<{ id: number }>(
    `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan, jenis, bank_soal_id)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
     returning id`,
    [
      kuisId,
      soal.pertanyaan,
      JSON.stringify(pilihan),
      soal.jenis === "pg" ? soal.jawaban : null,
      soal.bobot,
      rows[0].urutan + 1,
      soal.jenis,
      bankSoalId,
    ],
  );

  await hitungUlangPercobaan(kuisId);
  return { ok: true, id: dibuat[0].id };
}

/**
 * Assigns bank questions into a quiz, in the order they were picked.
 *
 * This is a *copy*, not a reference. `soal` keeps the question text verbatim so
 * the attempt rows already keyed by `soal.id` keep their meaning, and so a later
 * edit in the bank cannot silently repaint marks. `bank_soal_id` records where
 * the copy came from, which is what makes "dipakai di N kuis" and the Sinkronkan
 * button possible.
 */
export async function tambahSoalDariBank(
  kuisId: number,
  guruId: string,
  bankIds: number[],
): Promise<Hasil & { jumlah: number }> {
  if (bankIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu soal dari bank.", jumlah: 0 };
  }

  const client = await pool.connect();
  let jumlah = 0;
  try {
    await client.query("begin");

    const { rows: urutanAwal } = await client.query<{ urutan: number }>(
      `select coalesce(max(urutan), 0)::int as urutan from soal where kuis_id = $1`,
      [kuisId],
    );
    let urutan = urutanAwal[0].urutan;

    // `= any($3)` cannot carry the pick order, so the array is walked and the
    // question is looked up one at a time. Thirty rows, one transaction.
    for (const bankId of bankIds) {
      const { rows } = await client.query<{
        jenis: JenisSoal;
        pertanyaan: string;
        pilihan: unknown;
        jawaban: string | null;
        bobot: number;
      }>(
        `select jenis, pertanyaan, pilihan, jawaban, bobot
           from bank_soal where id = $1 and guru_id = $2`,
        [bankId, guruId],
      );
      const soal = rows[0];
      if (!soal) continue;

      urutan += 1;
      await client.query(
        `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan, jenis, bank_soal_id)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)`,
        [
          kuisId,
          soal.pertanyaan,
          JSON.stringify(pilihanTersimpan(soal.pilihan)),
          soal.jenis === "pg" ? kunciTersimpan(soal.pilihan, soal.jawaban) : null,
          soal.bobot,
          urutan,
          soal.jenis,
          bankId,
        ],
      );
      jumlah += 1;
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  if (jumlah === 0) {
    return { ok: false, error: "Soal yang dipilih tidak ada di bank Anda.", jumlah: 0 };
  }

  await hitungUlangPercobaan(kuisId);
  return { ok: true, jumlah };
}

/**
 * Refreshes every copied question in a quiz from the bank.
 *
 * Deliberately manual. With attempts already collected the refresh re-scores
 * them (`hitungUlangPercobaan`), which is exactly why it must not happen on its
 * own the moment a teacher fixes a typo in the bank.
 */
export async function sinkronKuisDariBank(
  kuisId: number,
  guruId: string,
): Promise<Hasil & { jumlah: number }> {
  const { rows } = await pool.query<{ id: number }>(
    `update soal s
        set pertanyaan = b.pertanyaan,
            pilihan = b.pilihan,
            jawaban = b.jawaban,
            bobot = b.bobot,
            jenis = b.jenis
       from bank_soal b
      where b.id = s.bank_soal_id
        and b.guru_id = $2
        and s.kuis_id = $1
        and (b.pertanyaan <> s.pertanyaan
             or coalesce(b.pilihan, '{}'::jsonb)
                is distinct from coalesce(s.pilihan, '{}'::jsonb)
             or b.jawaban is distinct from s.jawaban
             or b.jenis <> s.jenis
             or b.bobot <> s.bobot)
      returning s.id`,
    [kuisId, guruId],
  );

  if (rows.length === 0) {
    return { ok: true, jumlah: 0 };
  }

  await hitungUlangPercobaan(kuisId);
  return { ok: true, jumlah: rows.length };
}

export async function ubahSoal(
  kuisId: number,
  soalId: number,
  soal: SoalMasuk,
): Promise<Hasil> {
  const pilihan = soal.jenis === "pg" ? rapikanPilihan(soal.pilihan) : {};
  const { rowCount } = await pool.query(
    `update soal
        set pertanyaan = $3, pilihan = $4::jsonb, jawaban = $5, bobot = $6, jenis = $7
      where id = $2 and kuis_id = $1`,
    [
      kuisId,
      soalId,
      soal.pertanyaan,
      JSON.stringify(pilihan),
      soal.jenis === "pg" ? soal.jawaban : null,
      soal.bobot,
      soal.jenis,
    ],
  );
  if (rowCount === 0) return { ok: false, error: "Soal tidak ditemukan." };

  await hitungUlangPercobaan(kuisId);
  return { ok: true };
}

/** Deletes a question and closes the gap it leaves in the numbering. */
export async function hapusSoal(kuisId: number, soalId: number): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `delete from soal where id = $2 and kuis_id = $1`,
    [kuisId, soalId],
  );
  if (rowCount === 0) return { ok: false, error: "Soal tidak ditemukan." };

  await pool.query(
    `update soal s
        set urutan = tertib.baru
       from (select id, row_number() over (order by urutan asc, id asc) as baru
               from soal where kuis_id = $1) tertib
      where s.id = tertib.id and s.urutan <> tertib.baru`,
    [kuisId],
  );

  await hitungUlangPercobaan(kuisId);
  return { ok: true };
}

export async function imporSoal(
  kuisId: number,
  daftar: SoalMasuk[],
): Promise<Hasil & { jumlah: number }> {
  if (daftar.length === 0) {
    return { ok: false, error: "Tidak ada soal yang bisa dibaca dari teks itu.", jumlah: 0 };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ urutan: number }>(
      `select coalesce(max(urutan), 0)::int as urutan from soal where kuis_id = $1`,
      [kuisId],
    );
    let urutan = rows[0].urutan;

    for (const soal of daftar) {
      urutan += 1;
      const pilihan = soal.jenis === "pg" ? rapikanPilihan(soal.pilihan) : {};
      await client.query(
        `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan, jenis)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
        [
          kuisId,
          soal.pertanyaan,
          JSON.stringify(pilihan),
          soal.jenis === "pg" ? soal.jawaban : null,
          soal.bobot,
          urutan,
          soal.jenis,
        ],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  await hitungUlangPercobaan(kuisId);
  return { ok: true, jumlah: daftar.length };
}

function acak<T>(daftar: T[]): T[] {
  const salinan = [...daftar];
  for (let i = salinan.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [salinan[i], salinan[j]] = [salinan[j], salinan[i]];
  }
  return salinan;
}

/**
 * Opens an attempt, or hands back the one already in progress.
 *
 * The question order and the option order are frozen here, once, so a refresh
 * cannot reshuffle the paper under the student's hands. `batas_at` is this
 * student's own deadline: their duration, capped by the quiz's closing time.
 */
export async function mulaiPercobaan({
  ruangId,
  kuisId,
  siswaId,
  kelasId,
}: {
  ruangId: number;
  kuisId: number;
  siswaId: string;
  kelasId: number;
}): Promise<Hasil> {
  const kuis = await getKuisDetail(ruangId, kuisId);
  if (!kuis) return { ok: false, error: "Kuis tidak ditemukan." };

  const sudah = await getPercobaanSiswa(kuisId, siswaId);
  const izin = bolehKerjakan(kuis, sudah ? { selesai: sudah.selesai } : null);
  if (!izin.ok) return { ok: false, error: izin.alasan };
  if (sudah) return { ok: true };

  // The student must belong to this room's class; checked here because the id
  // arrives from the browser.
  const { rows: milik } = await pool.query<{ n: number }>(
    `select count(*)::int as n from "user"
      where id = $1 and role = 'siswa' and aktif and kelas_id = $2`,
    [siswaId, kelasId],
  );
  if (milik[0].n === 0) return { ok: false, error: "Anda bukan siswa kelas ini." };

  const soal = await listSoal(kuisId);
  const urutan: UrutanSoal = {
    soal: kuis.acakSoal ? acak(soal.map((item) => item.id)) : soal.map((item) => item.id),
    opsi: {},
  };
  for (const item of soal) {
    const huruf = Object.keys(item.pilihan).sort();
    urutan.opsi[String(item.id)] = kuis.acakOpsi ? acak(huruf) : huruf;
  }

  await pool.query(
    `insert into percobaan (kuis_id, siswa_id, batas_at, urutan_soal, jawaban, nilai_esai)
     values ($1, $2,
             least(now() + make_interval(mins => $3::int),
                   coalesce($4::timestamptz, 'infinity'::timestamptz)),
             $5::jsonb, '{}'::jsonb, '{}'::jsonb)
     on conflict (kuis_id, siswa_id) do nothing`,
    [kuisId, siswaId, kuis.durasiMenit, selesaiIso(kuis), JSON.stringify(urutan)],
  );

  return { ok: true };
}

/**
 * The quiz's closing time as a timestamptz literal.
 *
 * `getKuisDetail` hands back a Jakarta-local string; wrapping it back into the
 * right zone is the only way to compare it with `now()` in the insert above.
 */
function selesaiIso(kuis: { selesai: string | null }): string | null {
  if (!kuis.selesai) return null;
  return `${kuis.selesai.replace(" ", "T")}:00+07:00`;
}

/**
 * Autosave from the quiz screen.
 *
 * A rejected save is not an error the student should have to dismiss: the
 * response says `ditutup: true` and the screen submits what it has.
 *
 * The closing time is re-read from the quiz as well as from the attempt's own
 * deadline, so a teacher who closes the quiz early really does stop the students
 * still working — their last answers are collected, not silently accepted.
 */
export async function simpanJawaban({
  kuisId,
  siswaId,
  jawaban,
}: {
  kuisId: number;
  siswaId: string;
  jawaban: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; error: string; ditutup: boolean }> {
  const { rows } = await pool.query<{ lewat: boolean; selesai: boolean }>(
    `select ((c.batas_at is not null and now() > c.batas_at)
              or (q.selesai is not null and now() > q.selesai)) as lewat,
            c.selesai is not null as selesai
       from percobaan c
       join kuis q on q.id = c.kuis_id
      where c.kuis_id = $1 and c.siswa_id = $2`,
    [kuisId, siswaId],
  );

  const row = rows[0];
  if (!row) return { ok: false, error: "Kuis ini belum dimulai.", ditutup: false };
  if (row.selesai) return { ok: false, error: "Kuis sudah dikumpulkan.", ditutup: false };
  if (row.lewat) return { ok: false, error: "Waktu kuis sudah habis.", ditutup: true };

  await pool.query(
    `update percobaan set jawaban = $3::jsonb
      where kuis_id = $1 and siswa_id = $2 and selesai is null`,
    [kuisId, siswaId, JSON.stringify(jawaban)],
  );
  return { ok: true };
}

/** Collects the attempt and scores whatever can be scored. */
export async function kumpulkanPercobaan({
  kuisId,
  siswaId,
  jawaban,
}: {
  kuisId: number;
  siswaId: string;
  jawaban: Record<string, string>;
}): Promise<Hasil & { nilai: number | null }> {
  const soal = await listSoal(kuisId);
  if (soal.length === 0) {
    return { ok: false, error: "Kuis ini tidak punya soal.", nilai: null };
  }

  const percobaan = await getPercobaanSiswa(kuisId, siswaId);
  if (!percobaan) return { ok: false, error: "Kuis ini belum dimulai.", nilai: null };
  if (percobaan.selesai) return { ok: false, error: "Kuis sudah dikumpulkan.", nilai: null };

  const nilai = nilaiPercobaan(soal, jawaban, percobaan.nilaiEsai);

  await pool.query(
    `update percobaan
        set jawaban = $3::jsonb, selesai = now(), nilai = $4
      where kuis_id = $1 and siswa_id = $2 and selesai is null`,
    [kuisId, siswaId, JSON.stringify(jawaban), nilai],
  );

  return { ok: true, nilai };
}

/**
 * Saves essay scores for one student and re-scores the attempt.
 *
 * `nilai_esai` is a per-question map, so correcting one essay does not wipe the
 * scores already given to the others.
 */
export async function koreksiEsai({
  kuisId,
  siswaId,
  nilaiEsai,
}: {
  kuisId: number;
  siswaId: string;
  nilaiEsai: Record<string, number>;
}): Promise<Hasil & { nilai: number | null }> {
  const soal = await listSoal(kuisId);
  const percobaan = await getPercobaanSiswa(kuisId, siswaId);
  if (!percobaan) return { ok: false, error: "Siswa ini belum mengerjakan kuis.", nilai: null };

  const gabungan = { ...percobaan.nilaiEsai };
  for (const [soalId, skor] of Object.entries(nilaiEsai)) {
    const butir = soal.find((item) => String(item.id) === soalId);
    if (!butir) return { ok: false, error: "Soal tidak ditemukan.", nilai: null };
    if (skor < 0 || skor > butir.bobot) {
      return { ok: false, error: `Skor esai harus 0–${butir.bobot}.`, nilai: null };
    }
    gabungan[soalId] = skor;
  }

  const nilai = nilaiPercobaan(soal, percobaan.jawaban, gabungan);

  await pool.query(
    `update percobaan set nilai_esai = $3::jsonb, nilai = $4
      where kuis_id = $1 and siswa_id = $2`,
    [kuisId, siswaId, JSON.stringify(gabungan), nilai],
  );

  return { ok: true, nilai };
}

/** Lets a student sit the quiz again by throwing their attempt away. */
export async function resetPercobaan(kuisId: number, siswaId: string): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `delete from percobaan where kuis_id = $1 and siswa_id = $2`,
    [kuisId, siswaId],
  );
  if (rowCount === 0) return { ok: false, error: "Percobaan tidak ditemukan." };
  return { ok: true };
}

export async function hapusKuis(ruangId: number, kuisId: number): Promise<Hasil> {
  const { rowCount } = await pool.query(
    `delete from kuis where id = $2 and ruang_id = $1`,
    [ruangId, kuisId],
  );
  if (rowCount === 0) return { ok: false, error: "Kuis tidak ditemukan." };
  return { ok: true };
}
