import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  /** Letterspaced label above the title — the system's other ALL-CAPS use. */
  overline?: string;
  /** Right-aligned count or note, set as an overline. */
  note?: string;
  actionHref?: string;
  actionLabel?: string;
  actions?: ReactNode;
  /**
   * Hairline under the header. On by default: a rule per section is what keeps
   * a monochrome page from reading as a void, and it costs no colour.
   */
  rule?: boolean;
  className?: string;
}

/**
 * The heading of every section — rails, grids, tabs' contents.
 *
 * Structure here is deliberate: with one hue and no illustration, the only
 * things that give the eye a place to land are the hairline, the overline and
 * the baseline they share. Spacing stays on the token scale.
 */
export function SectionHeader({
  title,
  overline,
  note,
  actionHref,
  actionLabel,
  actions,
  rule = true,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-4",
        rule && "border-b border-[var(--border-hairline)]",
        className,
      )}
    >
      {overline ? (
        <span className="type-overline w-full text-[var(--text-disabled)]">{overline}</span>
      ) : null}

      <h2 className="text-title-2 font-medium">{title}</h2>

      <span className="flex-1" />

      {note ? <span className="type-overline text-muted-foreground">{note}</span> : null}
      {actions}

      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-body-sm text-muted-foreground transition-colors duration-150 ease-evade hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight size={14} strokeWidth={1.5} />
        </Link>
      ) : null}
    </div>
  );
}
