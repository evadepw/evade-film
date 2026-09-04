import { get } from "@/lib/api/http";
import { endpoints } from "@/lib/api/endpoints";
import type {
  CatalogListParams,
  MovieDetailDto,
  MovieListDto,
  PaginatedDto,
  PlaybackBatchDto,
  PlaybackDto,
  PlaybackParams,
  SeriesDetailDto,
  SeriesListDto,
  SeriesPlaybackParams,
} from "@/lib/api/types";
import {
  mapMovieDetail,
  mapMovieSummary,
  mapPage,
  mapPlayback,
  mapSeriesDetail,
  mapSeriesPlayback,
  mapSeriesSummary,
} from "@/lib/domain/mappers";
import type {
  Page,
  PlaybackSource,
  SeriesPlayback,
  TitleDetail,
  TitleSummary,
} from "@/lib/domain/models";

/**
 * Catalog reads.
 *
 * Every function returns domain models, never DTOs: pages, rails and hooks all
 * consume the same shapes, and the wire format stays behind this boundary.
 */
/**
 * The catalogue's list endpoints resolve translations server-side and return a
 * flat `title`, so unlike the detail endpoints they cannot be translated after
 * the fact — the language has to travel with the request. `lang` is what the
 * backend reads; `Accept-Language` works too, but a query parameter keeps the
 * URL self-describing and the response cacheable per language.
 */
function withLang(params: CatalogListParams, locale?: string): CatalogListParams {
  return locale ? { ...params, lang: locale } : params;
}

export const catalogService = {
  async listMovies(
    params: CatalogListParams = {},
    locale?: string,
  ): Promise<Page<TitleSummary>> {
    const dto = await get<PaginatedDto<MovieListDto>>(endpoints.movies.list, {
      params: withLang(params, locale),
    });
    return mapPage(dto, (item) => mapMovieSummary(item, locale));
  },

  async getMovie(id: number | string, locale?: string): Promise<TitleDetail> {
    const dto = await get<MovieDetailDto>(endpoints.movies.detail(id), {
      params: locale ? { lang: locale } : undefined,
    });
    return mapMovieDetail(dto, locale);
  },

  async getMoviePlayback(
    id: number | string,
    params: PlaybackParams = {},
  ): Promise<PlaybackSource> {
    const dto = await get<PlaybackDto>(endpoints.movies.playback(id), { params });
    return mapPlayback(dto);
  },

  async listSeries(
    params: CatalogListParams = {},
    locale?: string,
  ): Promise<Page<TitleSummary>> {
    const dto = await get<PaginatedDto<SeriesListDto>>(endpoints.series.list, {
      params: withLang(params, locale),
    });
    return mapPage(dto, (item) => mapSeriesSummary(item, locale));
  },

  async getSeries(id: number | string, locale?: string): Promise<TitleDetail> {
    const dto = await get<SeriesDetailDto>(endpoints.series.detail(id), {
      params: locale ? { lang: locale } : undefined,
    });
    return mapSeriesDetail(dto, locale);
  },

  /**
   * One call returns signed manifests for every episode and voiceover of a
   * series — exactly the tree the player's content selector wants, so switching
   * episodes never waits on the network.
   */
  async getSeriesPlayback(
    id: number | string,
    params: PlaybackParams = {},
    locale?: string,
  ): Promise<SeriesPlayback> {
    const dto = await get<PlaybackBatchDto>(endpoints.series.playbackBatch(id), { params });
    return mapSeriesPlayback(dto, locale);
  },

  /** Single-episode playback. Used to refresh one expired manifest. */
  async getEpisodePlayback(
    id: number | string,
    params: SeriesPlaybackParams,
  ): Promise<PlaybackSource> {
    const dto = await get<PlaybackDto>(endpoints.series.playback(id), { params });
    return mapPlayback(dto);
  },

  /** Free-text search across both kinds, merged and sorted by relevance-ish. */
  async searchTitles(
    query: string,
    params: CatalogListParams = {},
    locale?: string,
  ): Promise<TitleSummary[]> {
    const [movies, series] = await Promise.all([
      this.listMovies({ ...params, search: query }, locale),
      this.listSeries({ ...params, search: query }, locale),
    ]);
    return [...movies.items, ...series.items];
  },
};
