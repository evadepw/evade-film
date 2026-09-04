"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ContentRow } from "@/components/interactions/content-row";
import { ListShell } from "@/components/account/list-shell";
import { useMyComments } from "@/hooks/use-me";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { formatRelativeTime, joinMeta } from "@/lib/format";
import { contentMeta } from "@/lib/format";

/**
 * The viewer's own comments, each with the title it was left on.
 *
 * Tombstones are included by the API, and kept here: a comment that was deleted
 * still explains a reply the viewer may remember writing.
 */
export function CommentsList() {
  const t = useDictionary();

  const list = useMyComments();

  return (
    <ListShell
      title={t.account.comments}
      total={list.total}
      isLoading={list.isLoading}
      isError={list.isError}
      isEmpty={list.items.length === 0}
      emptyTitle={t.account.noComments}
      emptyHint={t.account.noCommentsHint}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      onLoadMore={() => void list.loadMore()}
    >
      {list.items.map((comment) => (
        <ContentRow
          key={comment.id}
          content={comment.content}
          meta={joinMeta([contentMeta(comment.content), formatRelativeTime(comment.createdAt)])}
          aside={
            comment.likes + comment.dislikes > 0 ? (
              <span className="font-mono text-caption text-muted-foreground">
                +{comment.likes} / −{comment.dislikes}
              </span>
            ) : null
          }
        >
          {comment.isDeleted ? (
            <p className="text-body-sm text-[var(--text-disabled)] italic">
              {t.comments.deletedBody}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {comment.isSpoiler ? (
                <Badge variant="outline" className="self-start">
                  {t.comments.spoiler}
                </Badge>
              ) : null}
              <Link
                href={comment.content.href}
                className="line-clamp-3 max-w-(--max-prose) text-body-sm text-foreground transition-colors duration-150 ease-evade hover:text-muted-foreground"
              >
                {comment.body}
              </Link>
            </div>
          )}
        </ContentRow>
      ))}
    </ListShell>
  );
}
