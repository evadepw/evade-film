import { ru } from "@/lib/i18n/dictionaries/ru";
import { en } from "@/lib/i18n/dictionaries/en";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locale";

/**
 * UI copy, resolved per locale.
 *
 * Russian is the source: `Dictionary` is its shape, so a key added there is a
 * type error in every other language until it is translated.
 *
 * Server components take the locale from their route params and call
 * `getDictionary` directly. Client components read the same object out of
 * `DictionaryProvider`, which the root layout seeds — see `useDictionary`.
 */
export type Dictionary = typeof ru;

const DICTIONARIES: Record<AppLocale, Dictionary> = { ru, en };

export function getDictionary(locale: AppLocale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
