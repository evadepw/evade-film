"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchCommand } from "@/components/catalog/search-dialog";
import { UserMenu } from "@/components/auth/user-menu";

import { useDictionary, useRoutes } from "@/lib/i18n/dictionary-context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navItems = (t: Dictionary, routes: Routes) =>
  [
    { href: routes.home, label: t.nav.home },
    { href: routes.movies, label: t.nav.movies },
    { href: routes.seriesList, label: t.nav.series },
  ] as const;

export interface SiteHeaderProps {
  siteName: string;
}

/**
 * Sticky top bar: transparent over a hero, glass after ~80px of scroll. It is
 * the only fixed element on web besides the player transport.
 */
export function SiteHeader({ siteName }: SiteHeaderProps) {
  const t = useDictionary();
  const routes = useRoutes();

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
        className="shrink-0 font-display text-title-3 font-medium tracking-[0.06em] whitespace-nowrap uppercase"
      >
        {siteName}
      </Link>

      {/*
        The links give way before the controls do: on a narrow screen the nav
        becomes a scrolling strip rather than pushing search and the account
        circle off the edge of the bar.
      */}
      <nav className="no-scrollbar flex min-w-0 items-center gap-5 overflow-x-auto md:gap-7">
        {navItems(t, routes).map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              // Colour alone carried the active state, which reaches neither a
              // screen reader nor anyone who cannot tell these two greys apart.
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 text-body-sm font-medium transition-colors duration-150 ease-evade",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <span className="flex-1" />

      <SearchCommand />

      <UserMenu />
    </header>
  );
}
