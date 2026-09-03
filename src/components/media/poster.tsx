import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PosterRatio = "poster" | "still" | "wide" | "square";

const RATIO_CLASS: Record<PosterRatio, string> = {
  poster: "aspect-[2/3]",
  still: "aspect-video",
  wide: "aspect-[21/9]",
  square: "aspect-square",
};

const RATIO_LABEL: Record<PosterRatio, string> = {
  poster: "2:3",
  still: "16:9",
  wide: "21:9",
  square: "1:1",
};

export interface PosterProps {
  src?: string | null;
  alt?: string;
  ratio?: PosterRatio;
  /** Shown in the placeholder when there is no artwork. */
  label?: string;
  /** `sizes` for the underlying next/image. */
  sizes?: string;
  /** Above-the-fold artwork: preloaded at high fetch priority. */
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  rounded?: boolean;
}

/**
 * The artwork frame. Evade ships no stock imagery, so every poster, still and
 * backdrop falls back to a placeholder — a subtle 135° ink gradient with a
 * centred image glyph and a ratio label — until real artwork arrives.
 */
export function Poster({
  src,
  alt = "",
  ratio = "poster",
  label,
  sizes = "(max-width: 768px) 45vw, 220px",
  priority = false,
  className,
  imageClassName,
  rounded = true,
}: PosterProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        RATIO_CLASS[ratio],
        rounded && "rounded-lg",
        "shadow-[var(--inset-hairline)]",
        !src && "bg-[image:var(--placeholder-fill)]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          // Mock artwork is local SVG, which the optimizer refuses to process
          // unless `dangerouslyAllowSVG` is on. Serving it as-is is cheaper and
          // keeps that flag out of the real config.
          unoptimized={src.startsWith("/")}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-silver-5">
          <ImageIcon size={ratio === "poster" ? 22 : 26} strokeWidth={1.5} />
          <span className="type-label px-3 text-center">{label ?? RATIO_LABEL[ratio]}</span>
        </span>
      )}
    </div>
  );
}
