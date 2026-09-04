/**
 * Copy is Russian-first, English secondary — the same rule the design system
 * states for content. The backend returns every translatable field as a map
 * keyed by BCP-47 tag, so resolution is a shared concern rather than something
 * each mapper reinvents.
 */

/** The languages the interface ships in, and the order they are offered in. */
export const LOCALES = ["ru", "en"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ru";

/**
 * What each language calls itself. Never translated: a list of languages is
 * read by someone who does not yet have the interface in their own — «Русский»
 * has to be recognisable to a reader looking at an English page.
 *
 * Adding a language is this map plus a dictionary; nothing in the UI enumerates
 * them by hand.
 */
export const LOCALE_NAME: Record<AppLocale, string> = {
  ru: "Русский",
  en: "English",
};

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Narrows a route segment, falling back rather than throwing on a stray path. */
export function toLocale(value: unknown): AppLocale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Order in which language tags are tried before giving up. */
export const LOCALE_FALLBACKS = [DEFAULT_LOCALE, "en"] as const;

export type TranslationMap<TField extends string> = Record<
  string,
  Partial<Record<TField, string>> | undefined
>;

function normalizeTag(tag: string): string {
  // The backend mixes BCP-47 (`ru`) with ISO 639-2 (`rus`) in track languages.
  const base = tag.toLowerCase().split(/[-_]/)[0];
  const iso3to1: Record<string, string> = { rus: "ru", eng: "en", ukr: "uk", deu: "de", fra: "fr" };
  return iso3to1[base] ?? base;
}

/**
 * Resolve one translated field: preferred locale → fallbacks → any non-empty
 * value. Empty strings count as missing; the backend uses them for "not set".
 */
export function translate<TField extends string>(
  translations: TranslationMap<TField> | null | undefined,
  field: TField,
  locale: string = DEFAULT_LOCALE,
): string | null {
  if (!translations) return null;

  const byTag = new Map<string, Partial<Record<TField, string>>>();
  for (const [tag, fields] of Object.entries(translations)) {
    if (fields) byTag.set(normalizeTag(tag), fields);
  }

  const candidates = [normalizeTag(locale), ...LOCALE_FALLBACKS.map(normalizeTag)];
  for (const tag of candidates) {
    const value = byTag.get(tag)?.[field];
    if (value) return value;
  }

  for (const fields of byTag.values()) {
    if (fields[field]) return fields[field] as string;
  }

  return null;
}

/** Human name for a track language tag. Falls back to the tag itself. */
export function languageName(tag: string, locale: string = DEFAULT_LOCALE): string {
  const normalized = normalizeTag(tag);
  try {
    const names = new Intl.DisplayNames([locale], { type: "language" });
    const name = names.of(normalized);
    if (name && name !== normalized) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {
    // Intl.DisplayNames is unavailable for this tag — fall through.
  }
  return normalized.toUpperCase();
}
