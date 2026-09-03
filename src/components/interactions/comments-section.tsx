"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentForm } from "@/components/interactions/comment-form";
import { CommentItem, type CommentActions } from "@/components/interactions/comment-item";
import { SignInPrompt } from "@/components/auth/sign-in-prompt";
import { StateBlock } from "@/components/feedback/state-block";
import { SectionHeader } from "@/components/layout/section-header";
import { useComments } from "@/hooks/use-interactions";
import { dictionary } from "@/lib/i18n/dictionary";
import type { CommentOrdering } from "@/lib/api/types";
import type { ContentType } from "@/lib/domain/models";

export interface CommentsSectionProps {
  type: ContentType;
  id: number;
}

const ORDERINGS: Array<[CommentOrdering, string]> = [
  ["new", dictionary.comments.sortNew],
  ["top", dictionary.comments.sortTop],
  ["old", dictionary.comments.sortOld],
];

/**
 * The discussion under a title.
 *
 * Threads are one level deep in the schema, and the UI keeps them that way: a
 * reply box appears only on a root comment, and a reply to a reply is attached
 * to the root — the same re-parenting the backend does, done before the request
 * so the thread never jumps after it lands.
 */
export function CommentsSection({ type, id }: CommentsSectionProps) {
  const [ordering, setOrdering] = useState<CommentOrdering>("new");
  const {
    comments,
    total,
    isLoading,
    hasMore,
    loadMore,
    isLoadingMore,
    canPost,
    isBanned,
    viewerId,
    isStaff,
    add,
    edit,
    remove,
    react,
  } = useComments(type, id, ordering);

  const actions: CommentActions = {
    canPost,
    viewerId,
    isStaff,
    onReply: async ({ body, isSpoiler, parentId }) => {
      await add.mutateAsync({ body, isSpoiler, parentId });
    },
    onEdit: async ({ commentId, body, isSpoiler }) => {
      await edit.mutateAsync({ commentId, body, is_spoiler: isSpoiler });
    },
    onDelete: async (commentId) => {
      await remove.mutateAsync(commentId);
    },
    onReact: async ({ commentId, value }) => {
      await react.mutateAsync({ commentId, value });
    },
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={dictionary.comments.title}
        note={total > 0 ? dictionary.comments.count(total) : undefined}
        actions={
          total > 1 ? (
            <Select value={ordering} onValueChange={(value) => setOrdering(value as CommentOrdering)}>
              <SelectTrigger size="sm" className="w-[180px]" aria-label={dictionary.catalog.sort}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDERINGS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {canPost ? (
        <CommentForm
          pending={add.isPending}
          onSubmit={async ({ body, isSpoiler }) => {
            await add.mutateAsync({ body, isSpoiler });
          }}
        />
      ) : isBanned ? (
        <p className="text-body-sm text-muted-foreground">{dictionary.account.commentBanned}</p>
      ) : (
        <SignInPrompt hint={dictionary.comments.signInHint} />
      )}

      {isLoading ? (
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <StateBlock
          title={dictionary.comments.empty}
          hint={canPost ? dictionary.comments.emptyHint : undefined}
          className="py-14"
        />
      ) : (
        <div className="flex flex-col gap-8">
          {comments.map((thread) => (
            <div key={thread.id} className="flex flex-col gap-5">
              <CommentItem comment={thread} actions={actions} threadId={thread.id} />

              {thread.replies.length > 0 ? (
                <div className="flex flex-col gap-5 border-l border-[var(--border-hairline)] pl-5 md:ml-12">
                  {thread.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      actions={actions}
                      threadId={thread.id}
                      isReply
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              disabled={isLoadingMore}
              onClick={() => void loadMore()}
            >
              {dictionary.action.more}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
