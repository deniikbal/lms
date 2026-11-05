import { pool } from "@/lib/db";

import type { RingkasRuang } from "@/lib/ruang-belajar";

/**
 * Data for the teacher dashboard. Every query here is read-only and scoped to
 * one guru, so the page can parallelise them without stepping on each other.
 */

export type SlotJadwalHariIni = {
  ruangId: number;
  mapel: string | null;
  kelas: string;
  jamMulai: string;
  jamSelesai: string;
  linkMeet: string | null;
  /** Jakarta minutes-from-midnight, for the "sedang berlangsung" highlight. */
  mulaiMenit: number;
  selesaiMenit: number;
};

export type TugasPerluDinilai = {
  tugasId: number;
  ruangId: number;
  judul: string;
  mapel: string | null;
  kelas: string;
  tenggat: string | null;
  masuk: number;
  dinilai: number;
};

/** Day of week (1 = Monday … 7 = Sunday), Jakarta. */
function waktuJakarta(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const bagian = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  const hariMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    hari: hariMap[bagian.weekday ?? "Mon"] ?? 1,
  };
}

/** Today's teaching slots for one guru, in wall-clock order. */
export async function listJadwalHariIni(
  guruId: string,
): Promise<SlotJadwalHariIni[]> {
  const { hari } = waktuJakarta();
  const { rows } = await pool.query<{
    ruang_id: number;
    mapel: string | null;
    kelas: string;
    jam_mulai: string;
    jam_selesai: string;
    link_meet: string | null;
    mulai_menit: number;
    selesai_menit: number;
  }>(
    `select r.id as ruang_id,
            m.nama as mapel,
            k.nama as kelas,
            to_char(j.jam_mulai, 'HH24:MI') as jam_mulai,
            to_char(j.jam_selesai, 'HH24:MI') as jam_selesai,
            j.link_meet,
            extract(hour from j.jam_mulai)::int * 60 + extract(minute from j.jam_mulai)::int as mulai_menit,
            extract(hour from j.jam_selesai)::int * 60 + extract(minute from j.jam_selesai)::int as selesai_menit
       from jadwal j
       join ruang r on r.id = j.ruang_id
       join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
      where r.guru_id = $1 and j.hari = $2
      order by j.jam_mulai asc`,
    [guruId, hari],
  );

  return rows.map((row) => ({
    ruangId: row.ruang_id,
    mapel: row.mapel,
    kelas: row.kelas,
    jamMulai: row.jam_mulai,
    jamSelesai: row.jam_selesai,
    linkMeet: row.link_meet,
    mulaiMenit: row.mulai_menit,
    selesaiMenit: row.selesai_menit,
  }));
}

/**
 * Published assignments of this guru that already have submissions, with the
 * count still waiting for a grade. Nearest deadline first; graded-out rows
 * (dinilai = masuk) are dropped by the page.
 */
export async function listTugasPerluDinilai(
  guruId: string,
): Promise<TugasPerluDinilai[]> {
  const { rows } = await pool.query<{
    tugas_id: number;
    ruang_id: number;
    judul: string;
    mapel: string | null;
    kelas: string;
    tenggat: string | null;
    masuk: number;
    dinilai: number;
  }>(
    `select t.id as tugas_id,
            r.id as ruang_id,
            t.judul,
            m.nama as mapel,
            k.nama as kelas,
            to_char(t.tenggat at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as tenggat,
            count(p.id)::int as masuk,
            count(p.id) filter (where p.nilai is not null)::int as dinilai
       from tugas t
       join ruang r on r.id = t.ruang_id
       join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
       join pengumpulan p on p.tugas_id = t.id
      where r.guru_id = $1 and t.terbit
      group by t.id, r.id, t.judul, m.nama, k.nama, t.tenggat
      having count(p.id) filter (where p.nilai is not null) < count(p.id)
      order by t.tenggat asc nulls last, t.id desc`,
    [guruId],
  );

  return rows.map((row) => ({
    tugasId: row.tugas_id,
    ruangId: row.ruang_id,
    judul: row.judul,
    mapel: row.mapel,
    kelas: row.kelas,
    tenggat: row.tenggat,
    masuk: row.masuk,
    dinilai: row.dinilai,
  }));
}

/** Room list plus a per-room count of published meetings, for the preview. */
export async function listRuangDenganPertemuan(
  guruId: string,
): Promise<(RingkasRuang & { pertemuanTerbit: number })[]> {
  const { rows } = await pool.query<RingkasRuang & { pertemuan_terbit: number }>(
    `with ruang_guru as (
        select r.id, r.kelas_id, k.nama as kelas_nama, m.nama as mapel_nama,
               m.kode as mapel_kode, u.name as guru_nama
          from ruang r
          join kelas k on k.id = r.kelas_id
          left join mapel m on m.id = r.mapel_id
          left join "user" u on u.id = r.guru_id
         where r.guru_id = $1
     )
     select g.id,
            g.kelas_nama,
            g.mapel_nama,
            g.mapel_kode,
            g.guru_nama,
            (select count(*) from pertemuan p where p.ruang_id = g.id)::int as pertemuan,
            (select count(*) from pertemuan p where p.ruang_id = g.id and p.terbit)::int as pertemuan_terbit,
            (select count(*) from tugas t where t.ruang_id = g.id and t.terbit)::int as tugas,
            (select count(*) from kuis q where q.ruang_id = g.id and q.terbit)::int as kuis,
            (select count(*) from "user" s
              where s.role = 'siswa' and s.aktif and s.kelas_id = g.kelas_id)::int as siswa,
            (select string_agg(
                       concat(hari_nama.hari, ' ', to_char(j.jam_mulai, 'HH24:MI')),
                       ', ' order by j.hari, j.jam_mulai)
               from jadwal j,
                    (values (1,'Senin'),(2,'Selasa'),(3,'Rabu'),(4,'Kamis'),(5,'Jumat'),(6,'Sabtu'),(0,'Minggu'))
                    as hari_nama(hari, nama)
              where j.ruang_id = g.id and hari_nama.hari = j.hari) as jadwal
       from ruang_guru g
      order by g.kelas_nama asc`,
    [guruId],
  );

  return rows.map(({ pertemuan_terbit, ...rest }) => ({
    ...rest,
    pertemuanTerbit: pertemuan_terbit,
  }));
}
