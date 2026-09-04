"use client";

import { PosterCard } from "@/components/media/poster-card";
import { Rail } from "@/components/catalog/rail";
import { useContinueWatching } from "@/hooks/use-me";
import { contentMeta, formatRemaining, joinMeta } from "@/lib/format";
import { useDictionary, useRoutes } from "@/lib/i18n/dictionary-context";


/**
 * «Продолжить просмотр».
 *
 * Renders nothing at all for a signed-out visitor, and nothing when the list
 * comes back empty — a rail that says «здесь пока пусто» above a catalogue that
 * is not is the kind of placeholder the design system rules out. The backend
 * already drops entries under 1 %, so a misclick never lands here.
 */
export function ContinueWatchingRail() {
  const t = useDictionary();
  const routes = useRoutes();

  const { data } = useContinueWatching();

  // No skeleton on purpose: a placeholder for a viewer who turns out to have no
  // history would push the whole page down and then snap it back.
  const entries = data?.items ?? [];
  if (entries.length === 0) return null;

  return (
    <Rail
      overline={t.home.continueWatchingOverline}
      title={t.home.continueWatching}
      actionHref={routes.account.history}
    >
      {entries.map((entry, index) => (
        <PosterCard
          key={entry.id}
          href={entry.content.watchHref}
          title={entry.content.title}
          meta={joinMeta([
            contentMeta(entry.content),
            formatRemaining(entry.positionSeconds, entry.durationSeconds),
          ])}
          poster={entry.content.poster}
          progress={entry.progress}
          sizes="184px"
          priority={index < 4}
          className="w-[136px] shrink-0 snap-start md:w-[184px]"
        />
      ))}
    </Rail>
  );
}
