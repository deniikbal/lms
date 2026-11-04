import { PlayCircleIcon } from "lucide-react";

/**
 * Extracts the video id from any common YouTube URL form — watch, youtu.be,
 * shorts, embed. Returns null for non-YouTube links (Meet, Drive, dll.), which
 * stay as plain external links.
 */
export function youtubeId(url: string): string | null {
  const pola = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of pola) {
    const cocok = url.match(p);
    if (cocok) return cocok[1];
  }
  return null;
}

/**
 * Inline YouTube player for a meeting's video links.
 *
 * `nocookie` domain avoids tracking cookies on load; `rel=0` keeps the
 * end-screen to the same channel. Non-YouTube URLs render nothing — the
 * caller falls back to the external link row.
 */
export function PemutarYouTube({ url, judul }: { url: string; judul: string }) {
  const id = youtubeId(url);
  if (!id) return null;

  return (
    <div className="space-y-1">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={judul}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <p className="flex items-center gap-1.5 px-1 text-[0.7rem] text-muted-foreground">
        <PlayCircleIcon className="size-3.5 shrink-0" />
        Video diputar di halaman ini — bisa juga{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 hover:text-foreground"
        >
          dibuka di YouTube
        </a>
      </p>
    </div>
  );
}
