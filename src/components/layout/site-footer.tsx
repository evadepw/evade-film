import Link from "next/link";

import { routes } from "@/lib/routes";
import { dictionary } from "@/lib/i18n/dictionary";

export interface SiteFooterProps {
  siteName: string;
  supportEmail?: string | null;
}

const SECTIONS = [
  { href: routes.movies, label: dictionary.nav.movies },
  { href: routes.seriesList, label: dictionary.nav.series },
  { href: routes.search(), label: dictionary.nav.search },
] as const;

export function SiteFooter({ siteName, supportEmail }: SiteFooterProps) {
  return (
    <footer className="page-gutter mt-auto border-t border-[var(--border-hairline)]">
      <div className="mx-auto w-full max-w-(--container-content)">
        <div className="flex flex-col gap-10 py-14 md:flex-row md:justify-between md:gap-14">
          <div className="flex max-w-[32ch] flex-col gap-3">
            <span className="font-display text-title-3 font-medium tracking-[0.06em] uppercase">
              {siteName}
            </span>
            <span className="text-body-sm text-muted-foreground">{dictionary.brand.tagline}</span>
          </div>

          <div className="flex flex-col gap-4">
            <span className="type-label text-[var(--text-disabled)]">Разделы</span>
            <nav className="flex flex-col gap-2.5 text-body-sm text-muted-foreground">
              {SECTIONS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <span className="type-label text-[var(--text-disabled)]">Поддержка</span>
            <div className="flex flex-col gap-2.5 text-body-sm text-muted-foreground">
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className="hover:text-foreground">
                  {supportEmail}
                </a>
              ) : (
                <span>Свяжитесь через администратора сервиса</span>
              )}
              <span className="font-mono text-caption text-[var(--text-disabled)]">
                Каталог обновляется ежедневно
              </span>
            </div>
          </div>
        </div>

        {/* A closing rule, so the page ends instead of trailing off into ink. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] py-6">
          <span className="type-overline text-[var(--text-disabled)]">{siteName}</span>
          <span className="font-mono text-caption text-[var(--text-disabled)]">
            {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}
