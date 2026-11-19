import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { googleTersedia, urlConnect } from "@/lib/google-form";
import { requireRole } from "@/lib/session";


/**
 * Starts the Google consent flow for the signed-in teacher.
 *
 * The state is a random value in an httpOnly cookie, checked by the callback
 * so a forged redirect cannot bind someone else's Google account.
 */
export async function GET() {
  const dasar = process.env.APP_URL ?? "https://lms.bethari.my.id";
  const user = await requireRole("guru");

  if (!googleTersedia()) {
    return NextResponse.redirect(new URL("/guru/bank-soal?google=belum-dikonfigurasi", dasar));
  }

  const state = crypto.randomUUID();
  const kuki = await cookies();
  kuki.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(urlConnect(state));
}
