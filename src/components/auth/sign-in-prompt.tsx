"use client";

import { SignInButton } from "@/components/auth/auth-dialog";

/**
 * The in-place «войдите, чтобы …» line. Used where a section is readable
 * without an account but not usable — the comment box, mainly.
 *
 * A hairline box rather than a banner: the section it replaces is part of the
 * page, and a filled callout would be the loudest thing on a monochrome screen.
 */
export function SignInPrompt({ hint }: { hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border-hairline)] px-5 py-4">
      <p className="flex-1 text-body-sm text-muted-foreground">{hint}</p>
      <SignInButton size="sm" />
    </div>
  );
}
