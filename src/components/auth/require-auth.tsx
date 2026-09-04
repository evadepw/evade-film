"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SignInButton } from "@/components/auth/auth-dialog";
import { StateBlock } from "@/components/feedback/state-block";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useAuth } from "@/providers/auth-provider";

/**
 * Gate for the account pages.
 *
 * Not a redirect: the token is read in the browser, so a server-side guard
 * would have nothing to check and a `useEffect` redirect would flash the page
 * first. Asking to sign in, in place, is both honest and reversible — the
 * dialog closes onto the page the viewer wanted.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const t = useDictionary();

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-6">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <StateBlock
        title={t.auth.needAccount}
        hint={t.auth.needAccountHint}
        action={<SignInButton />}
      />
    );
  }

  return <>{children}</>;
}
