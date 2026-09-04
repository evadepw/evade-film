"use client";

import { usePathname, useRouter } from "next/navigation";

import { useLocale } from "@/lib/i18n/dictionary-context";
import type { AppLocale } from "@/lib/i18n/locale";
import { LOCALE_COOKIE } from "@/middleware";

/**
 * Records the choice for a year, site-wide. Outside the hook because the React
 * Compiler treats a write to `document` inside one as modifying a value the
 * component does not own.
 */
function remember(locale: AppLocale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Changing the interface language.
 *
 * Switching rewrites the first path segment, so the viewer stays on the page
 * they were reading, and records the choice in a cookie — that is what the
 * middleware consults the next time someone arrives at a bare address.
 */
export function useLocaleSwitch() {
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: AppLocale) => {
    if (next === current) return;

    remember(next);

    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || `/${next}`);
  };

  return { current, switchTo };
}
