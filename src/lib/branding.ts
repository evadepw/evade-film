import { cache } from "react";

import { brandingService } from "@/lib/api/services/branding.service";
import { dictionary } from "@/lib/i18n/dictionary";
import type { Branding } from "@/lib/domain/models";

const FALLBACK: Branding = {
  name: dictionary.brand.name,
  tagline: dictionary.brand.tagline,
  logo: null,
  favicon: null,
  siteUrl: null,
  supportEmail: null,
};

/**
 * Branding is read by the root layout, so it must never throw: a cold or
 * unreachable API degrades to the design system's own defaults rather than
 * taking down every page. `cache` de-duplicates it within one render.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    return await brandingService.get();
  } catch {
    return FALLBACK;
  }
});
