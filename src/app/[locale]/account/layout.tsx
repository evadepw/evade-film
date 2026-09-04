import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { SectionNav } from "@/components/layout/section-nav";
import { getDictionary } from "@/lib/i18n/dictionary";
import { toLocale } from "@/lib/i18n/locale";
import { localeRoutes, type Routes } from "@/lib/routes";
import type { Dictionary } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/account">): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.account.title };
}

const accountNav = (t: Dictionary, routes: Routes) =>
  [
    { href: routes.account.root, label: t.account.profile },
    { href: routes.account.watchlist, label: t.account.watchlist },
    { href: routes.account.ratings, label: t.account.ratings },
    { href: routes.account.comments, label: t.account.comments },
    { href: routes.account.history, label: t.account.history },
  ] as const;

/**
 * The account section: one heading, one sub-nav, five collections underneath —
 * the same five the API exposes under `/api/v1/me/`.
 *
 * The gate sits in the layout rather than in each page, so a signed-out visitor
 * gets one prompt instead of five and the nav stays visible behind it.
 */
export default async function AccountLayout({ children, params }: LayoutProps<"/[locale]/account">) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const routes = localeRoutes(locale);
  return (
    <PageSection className="flex flex-col gap-8 pt-10 pb-24">
      <PageHeading overline={t.brand.name} title={t.account.title} />
      <SectionNav items={accountNav(t, routes)} />
      <RequireAuth>{children}</RequireAuth>
    </PageSection>
  );
}
