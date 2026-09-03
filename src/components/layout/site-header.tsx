"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { routes } from "@/lib/routes";
import { dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const NAV = [
  { href: routes.home, label: dictionary.nav.home },
  { href: routes.movies, label: dictionary.nav.movies },
  { href: routes.seriesList, label: dictionary.nav.series },
] as const;

export interface SiteHeaderProps {
  siteName: string;
}

/**
 * Sticky top bar: transparent over a hero, glass after ~80px of scroll. It is
 * the only fixed element on web besides the player transport.
 */
export function SiteHeader({ siteName }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === routes.home ? pathname === href : pathname.startsWith(href);

  /**
   * The bar is transparent only where it actually sits on artwork — the home
   * hero and title pages. Everywhere else it starts as glass, so the page has a
   * top edge instead of floating on flat ink.
   */
  const overHero = pathname === routes.home || /^\/(movies|series)\/[^/]+$/.test(pathname);
  const transparent = overHero && !scrolled;

  return (
    <header
      className={cn(
        "page-gutter sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-6 border-b transition-all duration-200 ease-evade md:gap-10",
        transparent
          ? "border-transparent bg-transparent"
          : "surface-glass border-[var(--border-hairline)]",
      )}
    >
      <Link
        href={routes.home}
        className="font-display text-title-3 font-medium tracking-[0.06em] whitespace-nowrap uppercase"
      >
        {siteName}
      </Link>

      <nav className="flex items-center gap-5 md:gap-7">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-body-sm font-medium transition-colors duration-150 ease-evade",
              isActive(item.href) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <span className="flex-1" />

      <Button asChild variant="ghost" size="icon" aria-label={dictionary.nav.search}>
        <Link href={routes.search()}>
          <Search strokeWidth={1.5} />
        </Link>
      </Button>

      <UserMenu />
    </header>
  );
}
