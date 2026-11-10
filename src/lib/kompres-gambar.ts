"use client";

/**
 * Client-side image compression before upload.
 *
 * Phone cameras hand over 3–8 MB JPEGs; a homework photo does not need that.
 * The image is drawn onto a canvas capped at the target's long edge and
 * re-encoded as JPEG, which reliably lands under ~300 KB per photo — readable
 * on screen, cheap to upload on mobile data, and quick for the teacher to open.
 *
 * Non-images (PDFs) pass through untouched, as do files already small enough.
 */

/** Long-edge cap in pixels — well above what a phone screen shows. */
const SISI_MAKS = 1920;
/** JPEG quality 0–1. 0.8 is the sweet spot for document photos. */
const KUALITAS = 0.8;
/** Files at or below this size skip re-encoding entirely. */
const LEWAT_BYTE = 512 * 1024;

/**
 * Hard ceiling every upload must land under. Vercel rejects Server Action
 * bodies above 4.5 MB at the infrastructure level — before Next.js can show
 * its own friendly limit error — so a too-big photo surfaces as the generic
 * "This page couldn't load" after a long upload. Anything the compression
 * loop cannot bring under this size is rejected client-side with a clear
 * message instead.
 */
export const BATAS_UNGGAH_BYTE = 4 * 1024 * 1024;

async function muatGambar(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((terbuka, gagal) => {
      img.onload = () => terbuka();
      img.onerror = () => gagal(new Error("Gambar tidak bisa dibaca."));
      img.src = url;
    });
    return img;
  } finally {
    // The bitmap stays alive via the element; only the object URL is freed.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/**
 * Returns a compressed copy of `file` when it is a large image, otherwise the
 * file itself. Compression failing must never block a submission — the
 * original is returned so the student can still send their work.
 */
export async function kompresGambar(file: File): Promise<File> {
  const gambar = file.type.startsWith("image/");
  const heic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  // HEIC is NOT skipped: iPhone cameras hand out HEIC by default and the
  // camera button on iOS Safari is exactly where students submit from. Safari
  // decodes HEIC onto the canvas fine; on other browsers the decode fails and
  // the catch below returns the original, so nothing regresses where it did
  // not work before.
  if (!gambar || file.size <= LEWAT_BYTE) return file;

  try {
    const img = await muatGambar(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(img.width, img.height));
    const lebar = Math.round(img.width * skala);
    const tinggi = Math.round(img.height * skala);

    const kanvas = document.createElement("canvas");
    kanvas.width = lebar;
    kanvas.height = tinggi;
    const konteks = kanvas.getContext("2d");
    if (!konteks) return file;
    // White base so PNGs with transparency do not turn black in JPEG.
    konteks.fillStyle = "#ffffff";
    konteks.fillRect(0, 0, lebar, tinggi);
    konteks.drawImage(img, 0, 0, lebar, tinggi);

    const blob = await new Promise<Blob | null>((terbuka) =>
      kanvas.toBlob(terbuka, "image/jpeg", KUALITAS),
    );
    if (!blob || blob.size >= file.size) return file; // no win, keep the original

    const nama = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nama, { type: "image/jpeg" });
  } catch {
    // Canvas may be unavailable (old browser, memory pressure); the original
    // uploads fine, it is just bigger.
    return file;
  }
}

/** Compress a whole selection, keeping order. */
export async function kompresSemua(files: File[]): Promise<File[]> {
  return Promise.all(files.map(kompresGambar));
}

/**
 * Human-readable check that a compressed file is actually uploadable.
 * Returns null when fine, or the message to show the student. PDFs larger
 * than the ceiling cannot be shrunk client-side, so the student is told to
 * scan lighter or send fewer pages.
 */
export function cekUkuran(file: File): string | null {
  if (file.size <= BATAS_UNGGAH_BYTE) return null;
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  const pdf = file.type === "application/pdf";
  return pdf
    ? `PDF "${file.name}" ${mb} MB melebihi batas 4 MB. Pindai ulang dengan resolusi lebih rendah atau kirim beberapa berkas.`
    : `Foto "${file.name}" (${mb} MB) tetap melebihi batas 4 MB setelah dipadatkan. Coba foto dengan pencahayaan lebih baik atau potong bagian yang tidak perlu.`;
}
