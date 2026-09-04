import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { getBranding } from "@/lib/branding";
import { getSiteUrl } from "@/lib/site";
import { DictionaryProvider } from "@/lib/i18n/dictionary-context";
import { LOCALES, toLocale, type AppLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

import "../globals.css";

/**
 * No brand font binaries were supplied with the design system, so it specifies
 * the nearest Google Fonts matches with full Cyrillic coverage. Swapping in real
 * faces is a change to these three declarations and nothing else.
 */
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

/** Both languages are prerendered; nothing here depends on the request. */
export function generateStaticParams(): Array<{ locale: AppLocale }> {
  return LOCALES.map((locale) => ({ locale }));
}

/** `ru` → `ru_RU`, which is what Open Graph wants. */
const OG_LOCALE: Record<AppLocale, string> = { ru: "ru_RU", en: "en_US" };

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const [branding, site] = await Promise.all([getBranding(), getSiteUrl()]);
  const description = branding.tagline ?? t.brand.tagline;

  return {
    // Without this every relative image and canonical below stays relative,
    // and a share card is only ever fetched from an absolute URL.
    metadataBase: site ?? undefined,
    title: {
      default: branding.name,
      template: `%s · ${branding.name}`,
    },
    description,
    icons: branding.favicon ? { icon: branding.favicon } : undefined,
    // Each language is its own address, and every page says so — otherwise the
    // two versions compete with each other in the index instead of pairing up.
    alternates: site
      ? {
          canonical: `/${locale}`,
          languages: Object.fromEntries(LOCALES.map((tag) => [tag, `/${tag}`])),
        }
      : undefined,
    openGraph: {
      siteName: branding.name,
      type: "website",
      locale: OG_LOCALE[locale],
      title: branding.name,
      description,
      images: branding.logo ?? undefined,
    },
    // A link to a film is shared far more often than it is typed, and a card
    // without this falls back to a bare URL.
    twitter: {
      card: "summary_large_image",
      title: branding.name,
      description,
      images: branding.logo ?? undefined,
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const branding = await getBranding();

  return (
    <html
      lang={locale}
      // Dark-only system: the `dark` class is permanent, there is no theme switch.
      className={`dark ${unbounded.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <DictionaryProvider locale={locale}>
        <QueryProvider>
          {/* Inside the query client: the session is a React Query entry too. */}
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              {/*
               * First tab stop on every page. A catalogue page puts a header,
               * a hero and several rows of artwork between the top of the
               * document and its content — dozens of stops to cross before
               * reaching anything a visitor came for.
               */}
              <a
                href="#content"
                className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-sm focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-body-sm focus-visible:font-semibold focus-visible:text-primary-foreground"
              >
                {t.a11y.skipToContent}
              </a>
              <SiteHeader siteName={branding.name} />
              {/* `tabIndex` so the jump moves focus, not just the scroll position. */}
              <main id="content" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
              <SiteFooter siteName={branding.name} supportEmail={branding.supportEmail} locale={locale} />
            </TooltipProvider>
            <Toaster position="bottom-center" />
          </AuthProvider>
        </QueryProvider>
        </DictionaryProvider>
      </body>
    </html>
  );
}
