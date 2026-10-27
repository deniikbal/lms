import { pool } from "@/lib/db";
import {
  type Board,
  type GuruOption,
  type JadwalSlot,
  type KelasRingkas,
  type MapelOption,
  type RuangRow,
  type TahunAktif,
} from "@/lib/pembagian-shared";

// Server-side consumers import everything from this module; the pure pieces
// live in `pembagian-shared` so Client Components can use them without pulling
// `pg` into the browser bundle.
export * from "@/lib/pembagian-shared";

/** The one year the screen works in. Older years stay in the database, unseen. */
export async function getTahunAktif(): Promise<TahunAktif | null> {
  const { rows } = await pool.query<TahunAktif>(
    `select id, nama, semester from tahun_ajaran where aktif = true
      order by id desc limit 1`,
  );
  return rows[0] ?? null;
}

export async function listKelasRingkas(): Promise<KelasRingkas[]> {
  const { rows } = await pool.query<KelasRingkas>(
    `select id, nama, tingkat from kelas order by tingkat asc nulls last, nama asc`,
  );
  return rows;
}

export async function getKelasRingkas(id: number): Promise<KelasRingkas | null> {
  const { rows } = await pool.query<KelasRingkas>(
    `select id, nama, tingkat from kelas where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Active teachers only — a room cannot be handed to a student or a dead account. */
export async function listGuru(): Promise<GuruOption[]> {
  const { rows } = await pool.query<GuruOption>(
    `select id, name from "user"
      where role = 'guru' and aktif = true
      order by name`,
  );
  return rows;
}

export async function guruIsGuru(id: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(
    `select exists(
       select 1 from "user" where id = $1 and role = 'guru' and aktif = true
     ) as ok`,
    [id],
  );
  return rows[0]?.ok === true;
}

export async function mapelAda(id: number): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(
    `select exists(select 1 from mapel where id = $1) as ok`,
    [id],
  );
  return rows[0]?.ok === true;
}

/** KKM a brand-new room inherits, from Pengaturan. */
export async function getKkmDefault(): Promise<number> {
  const { rows } = await pool.query<{ nilai: string | null }>(
    `select nilai from pengaturan where kunci = 'kkm'`,
  );
  const parsed = Number(rows[0]?.nilai);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 75;
}

type RawRuang = {
  id: number;
  mapel_id: number;
  kode: string;
  nama: string;
  guru_id: string | null;
  guru_nama: string | null;
  jadwal_id: number | null;
  hari: number | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  link_meet: string | null;
};

/**
 * The board for one class in one year.
 *
 * A single query with a LEFT JOIN on jadwal keeps the room list and its slots
 * consistent — rooms without slots still come back (one row, null slot).
 */
export async function getBoard(
  kelasId: number,
  taId: number,
): Promise<Board | null> {
  const kelas = await getKelasRingkas(kelasId);
  if (!kelas) return null;

  const ta = await pool.query<TahunAktif>(
    `select id, nama, semester from tahun_ajaran where id = $1`,
    [taId],
  );
  if (!ta.rows[0]) return null;

  const { rows } = await pool.query<RawRuang>(
    `select r.id,
            r.mapel_id,
            m.kode,
            m.nama,
            r.guru_id,
            u.name as guru_nama,
            j.id as jadwal_id,
            j.hari,
            to_char(j.jam_mulai, 'HH24:MI') as jam_mulai,
            to_char(j.jam_selesai, 'HH24:MI') as jam_selesai,
            j.link_meet
       from ruang r
       join mapel m on m.id = r.mapel_id
       left join "user" u on u.id = r.guru_id
       left join jadwal j on j.ruang_id = r.id
      where r.kelas_id = $1 and r.tahun_ajaran_id = $2
      order by m.nama asc, j.hari asc, j.jam_mulai asc`,
    [kelasId, taId],
  );

  const byRuang = new Map<number, RuangRow>();
  for (const row of rows) {
    let ruang = byRuang.get(row.id);
    if (!ruang) {
      ruang = {
        id: row.id,
        mapelId: row.mapel_id,
        kode: row.kode,
        nama: row.nama,
        guruId: row.guru_id,
        guruNama: row.guru_nama,
        jadwal: [],
      };
      byRuang.set(row.id, ruang);
    }
    if (row.jadwal_id !== null) {
      const slot: JadwalSlot = {
        id: row.jadwal_id,
        hari: row.hari ?? 1,
        jamMulai: row.jam_mulai ?? "",
        jamSelesai: row.jam_selesai ?? "",
        linkMeet: row.link_meet,
      };
      ruang.jadwal.push(slot);
    }
  }

  const { rows: tersedia } = await pool.query<MapelOption>(
    `select m.id, m.kode, m.nama
       from mapel m
      where not exists (
        select 1 from ruang r
         where r.mapel_id = m.id
           and r.kelas_id = $1
           and r.tahun_ajaran_id = $2
      )
      order by m.nama asc`,
    [kelasId, taId],
  );

  const guru = await listGuru();

  return {
    kelas: { id: kelas.id, nama: kelas.nama },
    ta: ta.rows[0],
    ruang: [...byRuang.values()],
    tersedia,
    guru,
  };
}

export type Hasil = { ok: true; inserted?: boolean } | { ok: false; error: string };

/**
 * Creates the room, or moves it to another teacher if it already exists.
 *
 * `firstOrNew(['tahun_ajaran_id','kelas_id','mapel_id'])` in the original app —
 * here it is `on conflict`, backed by `ruang_scope_unique`. Adding a subject and
 * swapping its teacher are therefore the same operation.
 */
export async function simpanRuang({
  taId,
  kelasId,
  mapelId,
  guruId,
}: {
  taId: number;
  kelasId: number;
  mapelId: number;
  guruId: string | null;
}): Promise<Hasil> {
  if (!(await mapelAda(mapelId))) {
    return { ok: false, error: "Mapel tidak ditemukan." };
  }
  if (guruId && !(await guruIsGuru(guruId))) {
    return { ok: false, error: "Guru pengampu harus dipilih dari daftar guru." };
  }

  const kkm = await getKkmDefault();

  const { rows } = await pool.query<{ inserted: boolean }>(
    `insert into ruang (tahun_ajaran_id, kelas_id, mapel_id, guru_id, kkm)
     values ($1, $2, $3, $4, $5)
     on conflict (tahun_ajaran_id, kelas_id, mapel_id)
     do update set guru_id = excluded.guru_id,
                   updated_at = now()
     returning (xmax = 0) as inserted`,
    [taId, kelasId, mapelId, guruId, kkm],
  );

  return { ok: true, inserted: rows[0]?.inserted ?? false };
}

export type HasilJadwal =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Adds one weekly slot.
 *
 * The clash check spans the whole class in the same year — two rooms of one
 * class cannot be taught at the same hour, and the message names the subject
 * that is already there so the admin knows what to move.
 */
export async function tambahJadwal({
  taId,
  kelasId,
  ruangId,
  hari,
  jamMulai,
  jamSelesai,
  linkMeet,
}: {
  taId: number;
  kelasId: number;
  ruangId: number;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
  linkMeet: string | null;
}): Promise<HasilJadwal> {
  const { rows: milik } = await pool.query<{ ok: boolean }>(
    `select exists(
       select 1 from ruang r
        where r.id = $1 and r.kelas_id = $2 and r.tahun_ajaran_id = $3
     ) as ok`,
    [ruangId, kelasId, taId],
  );
  if (!milik[0]?.ok) {
    return { ok: false, error: "Ruang belajar tidak ditemukan di kelas ini." };
  }

  const { rows: bentrok } = await pool.query<{
    mapel: string;
    mulai: string;
    selesai: string;
  }>(
    `select m.nama as mapel,
            to_char(j.jam_mulai, 'HH24:MI') as mulai,
            to_char(j.jam_selesai, 'HH24:MI') as selesai
       from jadwal j
       join ruang r on r.id = j.ruang_id
       join mapel m on m.id = r.mapel_id
      where r.kelas_id = $1
        and r.tahun_ajaran_id = $2
        and j.hari = $3
        and j.jam_mulai < $5::time
        and j.jam_selesai > $4::time
      limit 1`,
    [kelasId, taId, hari, jamMulai, jamSelesai],
  );

  const tabrak = bentrok[0];
  if (tabrak) {
    return {
      ok: false,
      error: `Bentrok dengan ${tabrak.mapel} pukul ${tabrak.mulai}–${tabrak.selesai}.`,
    };
  }

  await pool.query(
    `insert into jadwal (ruang_id, hari, jam_mulai, jam_selesai, link_meet)
     values ($1, $2, $3::time, $4::time, $5)`,
    [ruangId, hari, jamMulai, jamSelesai, linkMeet],
  );

  return { ok: true };
}

export async function hapusJadwal(id: number): Promise<void> {
  await pool.query(`delete from jadwal where id = $1`, [id]);
}

/**
 * Room content that must block a delete. `pertemuan` and `tugas` arrive with
 * their own screens, so the check is skipped while the table is missing rather
 * than throwing — it starts protecting the moment they exist.
 */
async function countAnak(
  table: "pertemuan" | "tugas",
  ruangId: number,
): Promise<number> {
  const { rows } = await pool.query<{ ada: boolean }>(
    `select to_regclass($1) is not null as ada`,
    [`public.${table}`],
  );
  if (!rows[0]?.ada) return 0;

  const { rows: count } = await pool.query<{ n: number }>(
    `select count(*)::int as n from ${table} where ruang_id = $1`,
    [ruangId],
  );
  return count[0]?.n ?? 0;
}

export type HasilHapus = { ok: true } | { ok: false; error: string };

/**
 * Removes a room — refused once it holds any meeting or assignment.
 *
 * The message points at the alternative on purpose: the usual reason to delete
 * a room is "the wrong teacher", and that is a teacher swap, not a delete.
 */
export async function hapusRuang(id: number): Promise<HasilHapus> {
  const [pertemuan, tugas] = await Promise.all([
    countAnak("pertemuan", id),
    countAnak("tugas", id),
  ]);

  if (pertemuan + tugas > 0) {
    return {
      ok: false,
      error:
        "Ruang ini sudah punya pertemuan atau tugas, jadi tidak bisa dihapus. Ganti guru pengampunya saja, atau kosongkan isinya lebih dulu.",
    };
  }

  const deleted = await pool.query(`delete from ruang where id = $1`, [id]);
  if (deleted.rowCount === 0) {
    return { ok: false, error: "Ruang belajar tidak ditemukan." };
  }
  return { ok: true };
}

export type RuangDetail = {
  id: number;
  kode: string;
  nama: string;
  kelasId: number;
  kelasNama: string;
  taNama: string;
  taSemester: string;
  guruNama: string | null;
  kkm: number;
  bobotTugas: number;
  bobotKuis: number;
  bobotKehadiran: number;
  deskripsi: string | null;
  jadwal: JadwalSlot[];
};

/** One room, for the page the subject name links to. */
export async function getRuangDetail(
  id: number,
): Promise<RuangDetail | null> {
  const { rows } = await pool.query<{
    id: number;
    kode: string;
    nama: string;
    kelas_id: number;
    kelas_nama: string;
    ta_nama: string | null;
    ta_semester: string | null;
    guru_nama: string | null;
    kkm: number;
    bobot_tugas: number;
    bobot_kuis: number;
    bobot_kehadiran: number;
    deskripsi: string | null;
  }>(
    `select r.id,
            m.kode,
            m.nama,
            r.kelas_id,
            k.nama as kelas_nama,
            t.nama as ta_nama,
            t.semester as ta_semester,
            u.name as guru_nama,
            r.kkm,
            r.bobot_tugas,
            r.bobot_kuis,
            r.bobot_kehadiran,
            r.deskripsi
       from ruang r
       join mapel m on m.id = r.mapel_id
       join kelas k on k.id = r.kelas_id
       left join tahun_ajaran t on t.id = r.tahun_ajaran_id
       left join "user" u on u.id = r.guru_id
      where r.id = $1`,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  const { rows: slots } = await pool.query<{
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
    [id],
  );

  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kelasId: row.kelas_id,
    kelasNama: row.kelas_nama,
    taNama: row.ta_nama ?? "—",
    taSemester: row.ta_semester ?? "—",
    guruNama: row.guru_nama,
    kkm: row.kkm,
    bobotTugas: row.bobot_tugas,
    bobotKuis: row.bobot_kuis,
    bobotKehadiran: row.bobot_kehadiran,
    deskripsi: row.deskripsi,
    jadwal: slots.map((slot) => ({
      id: slot.id,
      hari: slot.hari,
      jamMulai: slot.jam_mulai,
      jamSelesai: slot.jam_selesai,
      linkMeet: slot.link_meet,
    })),
  };
}
