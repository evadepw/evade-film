import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { getBranding } from "@/lib/branding";
import { dictionary } from "@/lib/i18n/dictionary";

import "./globals.css";

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

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();

  return {
    title: {
      default: branding.name,
      template: `%s · ${branding.name}`,
    },
    description: branding.tagline ?? dictionary.brand.tagline,
    icons: branding.favicon ? { icon: branding.favicon } : undefined,
    openGraph: {
      siteName: branding.name,
      type: "website",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const branding = await getBranding();

  return (
    <html
      lang="ru"
      // Dark-only system: the `dark` class is permanent, there is no theme switch.
      className={`dark ${unbounded.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          {/* Inside the query client: the session is a React Query entry too. */}
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <SiteHeader siteName={branding.name} />
              <main className="flex-1">{children}</main>
              <SiteFooter siteName={branding.name} supportEmail={branding.supportEmail} />
            </TooltipProvider>
            <Toaster position="bottom-center" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
