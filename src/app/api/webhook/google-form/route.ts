import { NextResponse } from "next/server";

import { prosesWebhook } from "@/lib/google-form";

export const runtime = "nodejs";

/**
 * Receives one Google Form submission from the quiz's Apps Script.
 *
 * Auth is the per-quiz token in the payload — the same secret embedded in the
 * script the teacher pasted. No session, no cookies: Apps Script has none.
 */
export async function POST(request: Request) {
  let isi: unknown;
  try {
    isi = await request.json();
  } catch {
    return NextResponse.json({ ok: false, alasan: "bentuk" }, { status: 400 });
  }

  const data = isi as { token?: unknown; nis?: unknown; jawaban?: unknown };
  const token = typeof data.token === "string" ? data.token : "";
  const nis = typeof data.nis === "string" ? data.nis.trim().slice(0, 32) : "";
  if (!token || !nis) {
    return NextResponse.json({ ok: false, alasan: "bentuk" }, { status: 400 });
  }

  const daftar = Array.isArray(data.jawaban) ? data.jawaban.slice(0, 200) : [];
  const jawaban = daftar
    .map((item) => {
      const satu = item as { i?: unknown; huruf?: unknown; teks?: unknown };
      return {
        i: Number(satu.i),
        huruf: typeof satu.huruf === "string" ? satu.huruf : null,
        teks: typeof satu.teks === "string" ? satu.teks : null,
      };
    })
    .filter((item) => Number.isInteger(item.i) && item.i >= 0);

  const hasil = await prosesWebhook(token, nis, jawaban);
  if (!hasil.ok) {
    // A wrong token is a probe; a wrong NIS is a student typo. Both are logged
    // by the script's failure email, so the status code stays simple.
    return NextResponse.json(hasil, { status: hasil.alasan === "token" ? 404 : 422 });
  }

  return NextResponse.json(hasil);
}
