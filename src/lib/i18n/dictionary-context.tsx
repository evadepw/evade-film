"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locale";
import { localeRoutes, type Routes } from "@/lib/routes";

interface LocaleValue {
  locale: AppLocale;
  dictionary: Dictionary;
}

const LocaleContext = createContext<LocaleValue>({
  locale: DEFAULT_LOCALE,
  dictionary: getDictionary(DEFAULT_LOCALE),
});

/**
 * Carries the request's locale across the server/client boundary.
 *
 * Client components cannot read route params, and the dictionary is chosen by
 * the `[locale]` segment — so the root layout, which does have the param,
 * hands it down through here. Only the tag crosses the boundary; the copy
 * itself is resolved on this side, so neither dictionary is serialised into
 * the RSC payload.
 */
export function DictionaryProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dictionary: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** The copy for the current locale. The client-side counterpart of `getDictionary`. */
export function useDictionary(): Dictionary {
  return useContext(LocaleContext).dictionary;
}

/** The current locale tag — for building links and formatting. */
export function useLocale(): AppLocale {
  return useContext(LocaleContext).locale;
}

/**
 * The route table for the current language. Every path carries the locale, so
 * a link built from the default table would drop an English reader back into
 * Russian on the next click.
 */
export function useRoutes(): Routes {
  return localeRoutes(useContext(LocaleContext).locale);
}
