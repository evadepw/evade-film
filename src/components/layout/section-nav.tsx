"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface SectionNavItem {
  href: string;
  label: string;
}

/**
 * The sub-navigation of a section, set on the hairline that already separates
 * the page heading from its content — one rule doing two jobs rather than a row
 * of pills floating over ink.
 */
export function SectionNav({ items, className }: { items: readonly SectionNavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "no-scrollbar -mb-px flex gap-6 overflow-x-auto border-b border-[var(--border-hairline)]",
        className,
      )}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b py-3 text-body-sm whitespace-nowrap transition-colors duration-150 ease-evade",
              active
                ? "border-silver-1 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
