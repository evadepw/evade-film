import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Page shell: 56px gutters (20px on mobile), 1440px max width, and the 56px
 * rhythm between rails that the spacing tokens describe.
 */
export function PageSection({
  children,
  className,
  gutter = true,
}: {
  children: ReactNode;
  className?: string;
  gutter?: boolean;
}) {
  return (
    <section className={cn(gutter && "page-gutter", className)}>
      <div className="mx-auto w-full max-w-(--container-content)">{children}</div>
    </section>
  );
}

/**
 * The top of a page. The hairline under it is what separates «minimal» from
 * «unfinished»: on a monochrome page the rule is the only thing marking where
 * the header ends and the content begins.
 */
export function PageHeading({
  title,
  overline,
  description,
  note,
  actions,
}: {
  title: string;
  overline?: string;
  description?: string;
  note?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 border-b border-[var(--border-hairline)] pb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-3">
          {overline ? <span className="type-overline text-muted-foreground">{overline}</span> : null}
          <h1 className="text-display-3 font-light md:text-display-2">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          {note ? <span className="type-overline text-muted-foreground">{note}</span> : null}
          {actions}
        </div>
      </div>
      {description ? (
        <p className="max-w-(--max-prose) text-body text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
