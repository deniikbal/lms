import { randomBytes } from "node:crypto";

import { pool } from "@/lib/db";
import { kunciTersimpan, nilaiPercobaan, pilihanTersimpan } from "@/lib/ruang-belajar-shared";
import type { SoalRow } from "@/lib/ruang-belajar-shared";

/**
 * Google Form integration, webhook model.
 *
 * A teacher turns a bank topic into a quiz that is answered in Google Forms:
 * the LMS creates the quiz row (with a per-quiz webhook token), hands back an
 * Apps Script that builds the form and installs an onFormSubmit trigger, and
 * the script posts each response here. Scores for multiple choice are computed
 * by the LMS from the stored answer key — the same path an in-app attempt
 * takes — so a Google Form quiz and a normal quiz read identically everywhere.
 */

const WEBHOOK_JALUR = "/api/webhook/google-form";

export type RuangPilihan = {
  id: number;
  kelasNama: string;
  mapelNama: string | null;
};

/** The teacher's rooms, newest subject match first — the dialog's dropdown. */
export async function listRuangUntukForm(guruId: string, mapelId: number | null): Promise<RuangPilihan[]> {
  const { rows } = await pool.query<{
    id: number;
    kelas_nama: string;
    mapel_nama: string | null;
  }>(
    `select r.id, coalesce(k.nama, 'Tanpa kelas') as kelas_nama, m.nama as mapel_nama
       from ruang r
       left join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
      where r.guru_id = $1
      order by (r.mapel_id is not distinct from $2) desc, k.nama asc nulls last`,
    [guruId, mapelId],
  );
  return rows.map((row) => ({ id: row.id, kelasNama: row.kelas_nama, mapelNama: row.mapel_nama }));
}

export type KuisGoogleBaru = {
  kuisId: number;
  token: string;
  script: string;
};

type SoalScript = {
  t: string;
  o: string[];
  /** Index of the correct option inside `o`; -1 for an essay. */
  k: number;
  b: number;
  e: boolean;
};

/** Builds the Apps Script text with the quiz's questions and token embedded. */
export function buatScriptAppsScript(urlApp: string, token: string, judul: string, soal: SoalScript[]): string {
  const data = JSON.stringify(soal, null, 1);
  return `// Script Google Form → LMS (token kuis: ${token.slice(0, 6)}…)
// Cara pakai: script.google.com → Proyek baru → tempel semua → jalankan buatDanPasang
// sekali (izinkan akses saat diminta). URL form muncul di popup, tempel ke LMS.
var WEBHOOK = "${urlApp}${WEBHOOK_JALUR}";
var TOKEN = "${token}";
var JUDUL = ${JSON.stringify(judul)};
var SOAL = ${data};

function buatDanPasang() {
  var form = FormApp.create(JUDUL)
    .setIsQuiz(true)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(true);
  form.addTextItem().setTitle("NIS").setRequired(true);
  SOAL.forEach(function (s) {
    if (s.e) {
      form.addParagraphTextItem().setTitle(s.t).setRequired(true);
      return;
    }
    var item = form.addMultipleChoiceItem();
    var opsi = s.o.map(function (v, j) { return item.createChoice(v, j === s.k); });
    item.setTitle(s.t).setChoices(opsi).setPoints(s.b).setRequired(true);
  });
  ScriptApp.newTrigger("kirimKeLms").forForm(form).onFormSubmit().create();
  Logger.log("URL form: " + form.getPublishedUrl());
  SpreadsheetApp.getUi().alert("Form dibuat!\\n\\nSalin URL ini ke LMS:\\n" + form.getPublishedUrl());
}

function kirimKeLms(e) {
  var peta = {};
  SOAL.forEach(function (s, i) { peta[s.t] = i; });
  var nis = "";
  var jawaban = [];
  e.response.getItemResponses().forEach(function (ir) {
    var judul = ir.getItem().getTitle();
    if (judul === "NIS") { nis = String(ir.getResponse()).trim(); return; }
    var i = peta[judul];
    if (i === undefined) return;
    var s = SOAL[i];
    if (s.e) {
      jawaban.push({ i: i, teks: String(ir.getResponse() || "") });
    } else {
      var j = s.o.indexOf(String(ir.getResponse() || ""));
      jawaban.push({ i: i, huruf: j >= 0 ? String.fromCharCode(65 + j) : null });
    }
  });
  var hasil = UrlFetchApp.fetch(WEBHOOK, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ token: TOKEN, nis: nis, jawaban: jawaban }),
    muteHttpExceptions: true,
  });
  var balikan = hasil.getResponseCode() === 200 ? JSON.parse(hasil.getContentText()) : { ok: false };
  if (!balikan.ok) {
    MailApp.sendEmail(Session.getEffectiveUser(), "Sinkron LMS gagal",
      "Ada jawaban yang tidak masuk LMS (NIS: " + nis + ").\\n" + hasil.getContentText());
  }
}`;
}

/**
 * Creates the draft quiz, copies the topic's questions into it, and returns the
 * script. The quiz stays unpublished until the teacher fills in the schedule in
 * the normal quiz editor.
 */
export async function buatKuisGoogleForm(
  guruId: string,
  topikId: number,
  ruangId: number,
  judul: string,
): Promise<{ ok: true; data: KuisGoogleBaru } | { ok: false; error: string }> {
  const bersih = judul.trim();
  if (!bersih || bersih.length > 120) {
    return { ok: false, error: "Judul wajib diisi (maks. 120 karakter)." };
  }

  const { rows: topik } = await pool.query<{ nama: string; mapel_id: number | null }>(
    `select nama, mapel_id from topik_bank where id = $2 and guru_id = $1`,
    [guruId, topikId],
  );
  if (!topik[0]) return { ok: false, error: "Topik tidak ditemukan di bank Anda." };

  const { rows: ruang } = await pool.query(`select 1 from ruang where id = $1 and guru_id = $2`, [
    ruangId,
    guruId,
  ]);
  if (ruang.length === 0) return { ok: false, error: "Ruang tidak ditemukan." };

  const { rows: soalBank } = await pool.query<{
    id: number;
    jenis: string;
    pertanyaan: string;
    pilihan: unknown;
    jawaban: string | null;
    bobot: number;
  }>(
    `select id, jenis, pertanyaan, pilihan, jawaban, bobot
       from bank_soal where guru_id = $1 and topik_id = $2 order by id asc`,
    [guruId, topikId],
  );
  if (soalBank.length === 0) return { ok: false, error: "Topik itu belum punya soal." };

  const token = randomBytes(24).toString("hex");

  const client = await pool.connect();
  let kuisId = 0;
  try {
    await client.query("begin");
    const { rows } = await client.query<{ id: number }>(
      `insert into kuis (ruang_id, judul, webhook_token)
       values ($1, $2, $3) returning id`,
      [ruangId, bersih, token],
    );
    kuisId = rows[0].id;

    for (let urutan = 0; urutan < soalBank.length; urutan += 1) {
      const s = soalBank[urutan];
      const pilihan = s.jenis === "pg" ? pilihanTersimpan(s.pilihan) : {};
      await client.query(
        `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan, jenis, bank_soal_id)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)`,
        [
          kuisId,
          s.pertanyaan,
          JSON.stringify(pilihan),
          s.jenis === "pg" ? kunciTersimpan(pilihan, s.jawaban) : null,
          s.bobot,
          urutan + 1,
          s.jenis,
          s.id,
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

  const soalScript: SoalScript[] = soalBank.map((s) => {
    const pilihan = s.jenis === "pg" ? pilihanTersimpan(s.pilihan) : {};
    const opsi = Object.keys(pilihan)
      .sort()
      .map((huruf) => pilihan[huruf]);
    return {
      t: s.pertanyaan,
      o: opsi,
      k: s.jenis === "pg" && s.jawaban ? opsi.indexOf(pilihan[s.jawaban]) : -1,
      b: s.bobot,
      e: s.jenis === "esai",
    };
  });

  const urlApp = process.env.APP_URL ?? "https://lms.bethari.my.id";
  return {
    ok: true,
    data: { kuisId, token, script: buatScriptAppsScript(urlApp, token, bersih, soalScript) },
  };
}

/** Saves the form URL the teacher copied out of the Apps Script popup. */
export async function simpanFormUrl(
  guruId: string,
  kuisId: number,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const bersih = url.trim();
  if (bersih && !/^https:\/\/docs\.google\.com\/forms\//.test(bersih)) {
    return { ok: false, error: "Tempel URL form Google (docs.google.com/forms/…)." };
  }
  const { rowCount } = await pool.query(
    `update kuis q
        set form_url = $3, updated_at = now()
       from ruang r
      where q.id = $2 and q.ruang_id = r.id and r.guru_id = $1`,
    [guruId, kuisId, bersih || null],
  );
  if (rowCount === 0) return { ok: false, error: "Kuis tidak ditemukan." };
  return { ok: true };
}

export type HasilWebhook =
  | { ok: true; nama: string; nilai: number | null }
  | { ok: false; alasan: "token" | "nis" | "bentuk" };

/**
 * Records one form submission.
 *
 * Answers arrive keyed by question index (the order the script added them),
 * which is the order the LMS copied them in. The attempt is upserted so an
 * edited response replaces the earlier one, then the score is recomputed with
 * the same function an in-app attempt uses — essays stay null until the teacher
 * corrects them in the LMS.
 */
export async function prosesWebhook(
  token: string,
  nis: string,
  jawabanMasuk: { i: number; huruf: string | null; teks: string | null }[],
): Promise<HasilWebhook> {
  const { rows: kuis } = await pool.query<{
    id: number;
    kelas_id: number | null;
  }>(
    `select q.id, r.kelas_id
       from kuis q join ruang r on r.id = q.ruang_id
      where q.webhook_token = $1`,
    [token],
  );
  if (!kuis[0]) return { ok: false, alasan: "token" };
  const kuisId = kuis[0].id;

  const { rows: soal } = await pool.query<{
    id: number;
    jenis: string;
    jawaban: string | null;
    bobot: number;
  }>(`select id, jenis, jawaban, bobot from soal where kuis_id = $1 order by urutan asc, id asc`, [
    kuisId,
  ]);

  const jawaban: Record<string, string> = {};
  for (const item of jawabanMasuk) {
    const s = soal[item.i];
    if (!s) continue;
    if (s.jenis === "pg") {
      if (item.huruf && /^[A-E]$/.test(item.huruf)) jawaban[String(s.id)] = item.huruf;
    } else if (item.teks) {
      jawaban[String(s.id)] = item.teks.slice(0, 5000);
    }
  }

  const { rows: siswa } = await pool.query<{ id: string; name: string }>(
    `select id, name from "user"
      where role = 'siswa' and aktif and username = $1
        and ($2::int is null or kelas_id = $2)
      limit 1`,
    [nis, kuis[0].kelas_id],
  );
  if (!siswa[0]) return { ok: false, alasan: "nis" };

  const nilaiEsai: Record<string, number> = {};
  const nilai = nilaiPercobaan(
    soal.map((s) => ({ id: s.id, jenis: s.jenis as SoalRow["jenis"], bobot: s.bobot, jawaban: s.jawaban })),
    jawaban,
    nilaiEsai,
  );

  await pool.query(
    `insert into percobaan (kuis_id, siswa_id, mulai, selesai, nilai, jawaban, nilai_esai)
     values ($1, $2, now(), now(), $3, $4::jsonb, '{}'::jsonb)
     on conflict (kuis_id, siswa_id) do update
       set selesai = now(), nilai = excluded.nilai, jawaban = excluded.jawaban,
           -- An edited response must not wipe essay scores already given.
           nilai_esai = percobaan.nilai_esai`,
    [kuisId, siswa[0].id, nilai, JSON.stringify(jawaban)],
  );

  return { ok: true, nama: siswa[0].name, nilai };
}
