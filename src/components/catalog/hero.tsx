import Link from "next/link";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/media/poster";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { AppLocale } from "@/lib/i18n/locale";
import { joinMeta, formatDuration } from "@/lib/format";
import { localeRoutes } from "@/lib/routes";
import type { TitleDetail } from "@/lib/domain/models";

export interface HeroProps {
  /** Resolved by the page from its `[locale]` segment. */
  locale: AppLocale;
  title: TitleDetail;
  overline?: string;
  /**
   * Preload the artwork. True for the first slide of the deck only — five
   * full-bleed backdrops at high fetch priority would race the one the
   * visitor is actually looking at.
   */
  priority?: boolean;
}

/**
 * One full-bleed still: 21:9 artwork protected by `--scrim-left` horizontally
 * and a vertical fade into the page ink. Text over media is never given a
 * capsule or a card — only a scrim.
 *
 * The height is the page's opening statement, so it is generous and grows with
 * the viewport, capped so a tall monitor does not turn it into a wall.
 * `HeroCarousel` stacks several of these; every slide is this component, which
 * is why the height lives here and not in the deck.
 */
export function Hero({ title, overline, locale, priority = true }: HeroProps) {
  const t = getDictionary(locale);
  const routes = localeRoutes(locale);
  const eyebrow = overline ?? t.home.heroOverline;
  const watchHref =
    title.kind === "movie" ? routes.watchMovie(title.id) : routes.watchSeries(title.id);

  const meta = joinMeta([
    title.year,
    title.country,
    title.kind === "movie"
      ? formatDuration(title.duration)
      : title.seasonCount
        ? t.title.seasons(title.seasonCount)
        : null,
  ]);

  return (
    <section className="relative h-[560px] md:h-[660px] lg:h-[min(78vh,780px)]">
      <div className="absolute inset-0">
        <Poster
          src={title.backdrop ?? title.poster}
          alt={title.title}
          ratio="wide"
          rounded={false}
          priority={priority}
          sizes="100vw"
          className="h-full shadow-none"
        />
      </div>
      <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-left)]" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,var(--ink-1)_0%,rgba(16,17,19,0)_46%)]"
      />

      <div className="page-gutter absolute inset-x-0 bottom-12 md:bottom-16 lg:bottom-20">
        <div className="mx-auto w-full max-w-(--container-content)">
          <div className="flex max-w-[520px] flex-col gap-5">
            <span className="type-overline text-muted-foreground">{eyebrow}</span>

            <h1 className="text-display-3 font-light md:text-display-1">{title.title}</h1>

            <div className="flex flex-wrap items-center gap-2.5 text-body-sm text-muted-foreground">
              {meta ? <span>{meta}</span> : null}
              {title.ageRating ? <Badge variant="outline">{title.ageRating}</Badge> : null}
            </div>

            {title.shortDescription || title.description ? (
              <p className="line-clamp-3 max-w-[440px] text-body text-muted-foreground">
                {title.shortDescription ?? title.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-3">
              <Button asChild variant="chrome" size="lg">
                <Link href={watchHref}>
                  <Play strokeWidth={1.5} />
                  {t.action.watch}
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={title.href}>{t.action.details}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
