import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { PageHeading, PageSection } from "@/components/layout/page-section";
import { SectionNav } from "@/components/layout/section-nav";
import { dictionary } from "@/lib/i18n/dictionary";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: dictionary.account.title,
};

const NAV = [
  { href: routes.account.root, label: dictionary.account.profile },
  { href: routes.account.watchlist, label: dictionary.account.watchlist },
  { href: routes.account.ratings, label: dictionary.account.ratings },
  { href: routes.account.comments, label: dictionary.account.comments },
  { href: routes.account.history, label: dictionary.account.history },
] as const;

/**
 * The account section: one heading, one sub-nav, five collections underneath —
 * the same five the API exposes under `/api/v1/me/`.
 *
 * The gate sits in the layout rather than in each page, so a signed-out visitor
 * gets one prompt instead of five and the nav stays visible behind it.
 */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <PageSection className="flex flex-col gap-8 pt-10 pb-24">
      <PageHeading overline={dictionary.brand.name} title={dictionary.account.title} />
      <SectionNav items={NAV} />
      <RequireAuth>{children}</RequireAuth>
    </PageSection>
  );
}
