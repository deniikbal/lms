import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { simpanKodeOauth } from "@/lib/google-form";
import { getSessionUser } from "@/lib/session";


/** Finishes the consent flow: verifies state, stores the refresh token. */
export async function GET(request: Request) {
  const dasar = process.env.APP_URL ?? "https://lms.bethari.my.id";
  const url = new URL(request.url);
  const kode = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const kuki = await cookies();
  const stateKuki = kuki.get("google_oauth_state")?.value;
  kuki.delete("google_oauth_state");

  const gagal = (alasan: string) =>
    NextResponse.redirect(new URL(`/guru/bank-soal?google=gagal&alasan=${alasan}`, dasar));

  if (!kode || !state || !stateKuki || state !== stateKuki) return gagal("state");
  if (!kode) return gagal("kode");

  const user = await getSessionUser();
  if (!user || user.role !== "guru") return gagal("sesi");

  const ok = await simpanKodeOauth(user.id, kode);
  if (!ok) return gagal("token");

  return NextResponse.redirect(new URL("/guru/bank-soal?google=terhubung", dasar));
}
