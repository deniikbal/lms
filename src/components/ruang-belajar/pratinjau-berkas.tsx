"use client";

import { useMemo, useState } from "react";
import { FileTextIcon, XIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

/**
 * Drive's `/view` link sends `X-Frame-Options: SAMEORIGIN`, so an iframe gets
 * "Anda memerlukan akses" even when the file is public. `/preview` serves the
 * same document in an embeddable player — that is the form made for iframes.
 */
function toPreviewUrl(url: string): string {
  const cocok = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  return cocok ? `https://drive.google.com/file/d/${cocok[1]}/preview` : url;
}

/**
 * One submitted file, opened as a preview modal: no padding, no header — the
 * document fills the whole dialog edge to edge. Images render inline; anything
 * else (PDF) goes through Drive's embeddable preview player.
 */
export function PratinjauBerkas({
  url,
  label,
  berkas,
  className,
}: {
  url: string;
  label: string;
  /** Which number this file is, when the submission holds several. */
  berkas?: { kini: number; total: number };
  className?: string;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const gambar = useMemo(
    () => /\.(jpe?g|png|webp|heic|gif)$/i.test(url) || url.includes("lh3.googleusercontent"),
    [url],
  );

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4 hover:text-primary",
              className,
            )}
          >
            <FileTextIcon className="size-3.5 shrink-0" />
            {label}
          </button>
        }
      />

      {/* Edge-to-edge: the file IS the dialog. */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[95vh] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-4xl"
      >
        <div className="relative h-[95vh] w-full bg-muted/20">
          {gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={label}
              className="h-full w-full object-contain"
            />
          ) : (
            <iframe
              src={toPreviewUrl(url)}
              title={label}
              className="h-full w-full border-0"
            />
          )}

          {/*
            The dialog's own close button is a ghost icon that disappears over a
            bright photo; this one is an opaque chip, always visible.
          */}
          <DialogPrimitive.Close
            data-slot="pratinjau-close"
            className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-popover/95 text-foreground shadow-md ring-1 ring-foreground/10 transition-colors hover:bg-popover"
            aria-label="Tutup pratinjau"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>

          {berkas && berkas.total > 1 ? (
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-popover/90 px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10 tabular-nums">
              Berkas {berkas.kini} dari {berkas.total}
            </span>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
