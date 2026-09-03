import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StateBlockProps {
  /** The fact. One line. */
  title: string;
  /** The next step. One line. */
  hint?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty and error states. The system's rule: name the fact and the next step,
 * in that order, two lines max — no illustration, no emoji, no exclamation.
 */
export function StateBlock({ title, hint, action, className }: StateBlockProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-5 py-24 text-center",
        className,
      )}
    >
      <p className="text-title-3 text-foreground">{title}</p>
      {hint ? <p className="max-w-[42ch] text-body text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
