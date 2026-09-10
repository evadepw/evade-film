import { get } from "@/lib/api/http";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type {
  CollectionDetailDto,
  CollectionEntryDto,
  CollectionItemsParams,
  CollectionListDto,
  CollectionListParams,
  PaginatedDto,
} from "@/lib/api/types";
import {
  mapCollection,
  mapCollectionDetail,
  mapCollectionEntry,
  mapPage,
} from "@/lib/domain/mappers";
import type { Collection, Page, TitleSummary } from "@/lib/domain/models";

/**
 * Editorial shelves.
 *
 * Like the catalogue service, every function returns domain models — a
 * `Collection` whose `items` are the same `TitleSummary` the rails and grids
 * already render, so nothing downstream learns a second card shape.
 */

/**
 * The collections endpoints resolve translations server-side for the list and
 * hand back the dict only on detail. `lang` is not in their schema, but the
 * catalogue's list endpoints read it and DRF ignores what it does not know, so
 * sending it costs nothing and wins where the backend does honour it. What
 * actually guarantees the viewer's language is `mapCollectionDetail`, which
 * re-resolves the title out of the dict.
 */
function withLang<T extends CollectionItemsParams>(params: T, locale?: string): T {
  return locale ? { ...params, lang: locale } : params;
}

/**
 * How far `getCollectionBySlug` will page looking for a slug. Shelves are
 * hand-authored and there are a handful of them; this only exists so a
 * mistyped URL cannot walk an unbounded listing.
 */
const MAX_SLUG_LOOKUP_PAGES = 5;

export const collectionsService = {
  /**
   * Published shelves in display order. Pass `expand: "items"` to inline every
   * row's cards — that is one request for a whole home page instead of one per
   * rail, and it is what the home page does.
   */
  async listCollections(
    params: CollectionListParams = {},
    locale?: string,
  ): Promise<Page<Collection>> {
    const dto = await get<PaginatedDto<CollectionListDto>>(endpoints.collections.list, {
      params: withLang(params, locale),
    });
    return mapPage(dto, (item) => mapCollection(item, locale));
  },

  /** One shelf by its numeric id, cards resolved. */
  async getCollection(
    id: number | string,
    params: CollectionItemsParams = {},
    locale?: string,
  ): Promise<Collection> {
    const dto = await get<CollectionDetailDto>(endpoints.collections.detail(id), {
      params: withLang(params, locale),
    });
    return mapCollectionDetail(dto, locale);
  },

  /**
   * One shelf by the slug the frontend routes on.
   *
   * The backend looks shelves up by primary key only, so a slug costs a listing
   * first. A numeric segment is taken at its word and goes straight through —
   * `/collections/3` stays a single request, and an id is what an admin
   * copying a link out of the API will have.
   */
  async getCollectionBySlug(
    slug: string,
    params: CollectionItemsParams = {},
    locale?: string,
  ): Promise<Collection> {
    if (/^\d+$/.test(slug)) return this.getCollection(slug, params, locale);

    for (let page = 1; page <= MAX_SLUG_LOOKUP_PAGES; page += 1) {
      const listing = await this.listCollections({ page }, locale);
      const match = listing.items.find((collection) => collection.slug === slug);
      if (match) return this.getCollection(match.id, params, locale);
      if (!listing.hasNext) break;
    }

    // Spelled as the backend's own 404 so `orNotFound` handles a bad slug and a
    // deleted shelf identically.
    throw new ApiError("Collection not found", { status: 404 });
  },

  /**
   * Just a shelf's cards. What a rail re-fetches when it pages or refreshes,
   * without paying for the shelf's own fields again.
   */
  async getCollectionItems(
    id: number | string,
    params: CollectionItemsParams = {},
    locale?: string,
  ): Promise<TitleSummary[]> {
    const dto = await get<CollectionEntryDto[]>(endpoints.collections.items(id), {
      params: withLang(params, locale),
    });
    return dto.map((item) => mapCollectionEntry(item, locale));
  },

  /**
   * The shelf flagged as main — the home page's hero.
   *
   * Null rather than a throw when nothing is flagged: the backend answers 404
   * for that, and a home page without a featured shelf is an ordinary state,
   * not a failure.
   */
  async getMainCollection(
    params: CollectionItemsParams = {},
    locale?: string,
  ): Promise<Collection | null> {
    try {
      const dto = await get<CollectionDetailDto>(endpoints.collections.main, {
        params: withLang(params, locale),
      });
      return mapCollectionDetail(dto, locale);
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return null;
      throw error;
    }
  },
};
