import { get } from "@/lib/api/http";
import { endpoints } from "@/lib/api/endpoints";
import type { OrganizationDto } from "@/lib/api/types";
import { mapBranding } from "@/lib/domain/mappers";
import type { Branding } from "@/lib/domain/models";

/**
 * Organization branding. The endpoint returns `{}` when nothing is configured,
 * so the caller always gets a usable object with the design-system defaults.
 *
 * Note: the API also exposes `primary_color` / `accent_color`. Evade Films is a
 * deliberately monochrome system — colour comes from the artwork, never from the
 * chrome — so those are read but not applied to the UI.
 */
export const brandingService = {
  async get(locale?: string): Promise<Branding> {
    const dto = await get<Partial<OrganizationDto>>(endpoints.branding);
    if (!dto || typeof dto.id !== "number") {
      return {
        name: "Evade Films",
        tagline: null,
        logo: null,
        favicon: null,
        siteUrl: null,
        supportEmail: null,
      };
    }
    return mapBranding(dto as OrganizationDto, locale);
  },
};
