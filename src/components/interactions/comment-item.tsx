"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/interactions/comment-form";
import { ApiError } from "@/lib/api/errors";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Comment } from "@/lib/domain/models";

export interface CommentActions {
  canPost: boolean;
  viewerId: number | null;
  isStaff: boolean;
  onReply: (input: { body: string; isSpoiler: boolean; parentId: number }) => Promise<void>;
  onEdit: (input: { commentId: number; body: string; isSpoiler: boolean }) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onReact: (input: { commentId: number; value: 1 | -1 }) => Promise<void>;
}

export interface CommentItemProps {
  comment: Comment;
  actions: CommentActions;
  /** Replies are one level deep — a reply never shows a reply box of its own. */
  isReply?: boolean;
  /** The root a reply is attached to; the API re-parents anything deeper. */
  threadId?: number;
  className?: string;
}

/**
 * One comment.
 *
 * Three states share this component and are not worth splitting: a normal
 * comment, a tombstone (deleted but still holding replies — body blank, actions
 * gone), and a spoiler, which stays hidden behind its own curtain until it is
 * clicked. A tombstone keeps its avatar and timestamp on purpose: the thread
 * below it needs something to hang from.
 */
export function CommentItem({
  comment,
  actions,
  isReply = false,
  threadId,
  className,
}: CommentItemProps) {
  const t = useDictionary();

  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [pending, setPending] = useState(false);

  const isAuthor = actions.viewerId !== null && actions.viewerId === comment.author.id;
  const canEdit = isAuthor && !comment.isDeleted;
  const canDelete = (isAuthor || actions.isStaff) && !comment.isDeleted;
  const canReact = actions.canPost && !isAuthor && !comment.isDeleted;

  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.error.title);
    } finally {
      setPending(false);
    }
  }

  const initial = (comment.author.displayName || comment.author.username).slice(0, 1);
  const timestamp = formatRelativeTime(comment.createdAt);

  return (
    <article className={cn("flex gap-3.5", className)}>
      <Avatar className={isReply ? "size-8" : undefined}>
        {comment.author.avatar ? <AvatarImage src={comment.author.avatar} alt="" /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={comment.author.href}
            className="text-body-sm font-semibold transition-colors duration-150 ease-evade hover:text-muted-foreground"
          >
            {comment.author.displayName}
          </Link>
          {timestamp ? (
            <span className="text-caption text-[var(--text-disabled)]">{timestamp}</span>
          ) : null}
          {comment.isEdited && !comment.isDeleted ? (
            <span className="text-caption text-[var(--text-disabled)]">
              {t.comments.edited}
            </span>
          ) : null}
        </div>

        {editing ? (
          <CommentForm
            initialBody={comment.body}
            initialSpoiler={comment.isSpoiler}
            submitLabel={t.comments.save}
            autoFocus
            pending={pending}
            onCancel={() => setEditing(false)}
            onSubmit={async ({ body, isSpoiler }) => {
              await run(async () => {
                await actions.onEdit({ commentId: comment.id, body, isSpoiler });
                setEditing(false);
              });
            }}
          />
        ) : comment.isDeleted ? (
          <p className="text-body-sm text-[var(--text-disabled)] italic">
            {t.comments.deletedBody}
          </p>
        ) : comment.isSpoiler && !spoilerRevealed ? (
          <button
            type="button"
            onClick={() => setSpoilerRevealed(true)}
            className="self-start rounded-sm border border-[var(--border-hairline)] px-3 py-2 text-body-sm text-muted-foreground transition-colors duration-150 ease-evade hover:border-silver-a20 hover:text-foreground"
          >
            {t.comments.spoilerHidden}
          </button>
        ) : (
          <p className="max-w-(--max-prose) text-body-sm whitespace-pre-line text-foreground">
            {comment.body}
          </p>
        )}

        {!comment.isDeleted && !editing ? (
          <div className="-ml-2 flex flex-wrap items-center gap-0.5">
            <ReactionButton
              label={t.comments.like}
              count={comment.likes}
              active={comment.myReaction === 1}
              disabled={!canReact || pending}
              Icon={ThumbsUp}
              onClick={() => void run(() => actions.onReact({ commentId: comment.id, value: 1 }))}
            />
            <ReactionButton
              label={t.comments.dislike}
              count={comment.dislikes}
              active={comment.myReaction === -1}
              disabled={!canReact || pending}
              Icon={ThumbsDown}
              onClick={() => void run(() => actions.onReact({ commentId: comment.id, value: -1 }))}
            />

            {actions.canPost && !isReply ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplying((open) => !open)}
              >
                {t.comments.reply}
              </Button>
            ) : null}

            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t.comments.edit}
                onClick={() => setEditing(true)}
              >
                <Pencil strokeWidth={1.5} />
              </Button>
            ) : null}

            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t.comments.remove}
                disabled={pending}
                onClick={() =>
                  void run(async () => {
                    await actions.onDelete(comment.id);
                    toast.success(t.comments.removed);
                  })
                }
              >
                <Trash2 strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
        ) : null}

        {replying ? (
          <CommentForm
            placeholder={t.comments.replyPlaceholder}
            submitLabel={t.comments.submit}
            autoFocus
            pending={pending}
            onCancel={() => setReplying(false)}
            onSubmit={async ({ body, isSpoiler }) => {
              await run(async () => {
                await actions.onReply({
                  body,
                  isSpoiler,
                  parentId: threadId ?? comment.id,
                });
                setReplying(false);
              });
            }}
          />
        ) : null}
      </div>
    </article>
  );
}

function ReactionButton({
  label,
  count,
  active,
  disabled,
  Icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  Icon: typeof ThumbsUp;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "text-foreground")}
    >
      <Icon strokeWidth={1.5} className={cn(active && "fill-silver-a40")} />
      {count > 0 ? <span className="font-mono text-caption">{count}</span> : null}
    </Button>
  );
}
