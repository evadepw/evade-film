import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";

/**
 * Puts a language on every address.
 *
 * The locale lives in the path rather than a cookie so each language is its own
 * URL — linkable, shareable and indexable, and still statically renderable. A
 * request without a prefix is redirected to one: the cookie if the viewer has
 * chosen before, otherwise what their browser asks for, otherwise Russian.
 */
function preferred(request: NextRequest): string {
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(remembered)) return remembered;

  // `Accept-Language` in descending quality order; the first tag we ship wins.
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (isLocale(tag)) return tag;
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred(request)}${pathname === "/" ? "" : pathname}`;
  url.search = search;

  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Everything except the API proxy, Next's own assets, and the files that must
   * keep their exact address — a crawler asks for `/robots.txt`, not
   * `/ru/robots.txt`.
   */
  matcher: [
    "/((?!api|_next|vendor|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)",
  ],
};
