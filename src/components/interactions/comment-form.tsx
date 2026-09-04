"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { cn } from "@/lib/utils";

export interface CommentFormProps {
  placeholder?: string;
  submitLabel?: string;
  initialBody?: string;
  initialSpoiler?: boolean;
  autoFocus?: boolean;
  pending?: boolean;
  onSubmit: (input: { body: string; isSpoiler: boolean }) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

/**
 * The one comment editor: new comment, reply and edit are the same two fields.
 *
 * The spoiler flag is a toggle rather than a checkbox because it is a property
 * of the text being written, not a setting — and because a pressed toggle is
 * the one state marker this system already draws.
 */
export function CommentForm({
  placeholder,
  submitLabel,
  initialBody = "",
  initialSpoiler = false,
  autoFocus,
  pending,
  onSubmit,
  onCancel,
  className,
}: CommentFormProps) {
  const t = useDictionary();
  const hint = placeholder ?? t.comments.placeholder;
  const submitText = submitLabel ?? t.comments.submit;

  const [body, setBody] = useState(initialBody);
  const [isSpoiler, setIsSpoiler] = useState(initialSpoiler);

  const trimmed = body.trim();

  async function handleSubmit(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    if (!trimmed || pending) return;
    await onSubmit({ body: trimmed, isSpoiler });
    setBody("");
    setIsSpoiler(false);
  }

  return (
    <form
      className={cn("flex flex-col gap-3", className)}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Textarea
        value={body}
        autoFocus={autoFocus}
        placeholder={hint}
        onChange={(event) => setBody(event.target.value)}
        // Enter is a newline in a comment; the shortcut is the modified one.
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void handleSubmit(event);
        }}
      />

      <div className="flex items-center gap-3">
        <Toggle
          variant="outline"
          size="sm"
          pressed={isSpoiler}
          onPressedChange={setIsSpoiler}
          aria-label={t.comments.spoiler}
        >
          <EyeOff strokeWidth={1.5} />
          {t.comments.spoiler}
        </Toggle>

        <span className="flex-1" />

        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t.comments.cancel}
          </Button>
        ) : null}

        <Button type="submit" size="sm" disabled={!trimmed || pending}>
          {submitText}
        </Button>
      </div>
    </form>
  );
}
