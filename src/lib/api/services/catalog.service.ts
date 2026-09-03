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
export const catalogService = {
  async listMovies(params: CatalogListParams = {}): Promise<Page<TitleSummary>> {
    const dto = await get<PaginatedDto<MovieListDto>>(endpoints.movies.list, { params });
    return mapPage(dto, mapMovieSummary);
  },

  async getMovie(id: number | string, locale?: string): Promise<TitleDetail> {
    const dto = await get<MovieDetailDto>(endpoints.movies.detail(id));
    return mapMovieDetail(dto, locale);
  },

  async getMoviePlayback(
    id: number | string,
    params: PlaybackParams = {},
  ): Promise<PlaybackSource> {
    const dto = await get<PlaybackDto>(endpoints.movies.playback(id), { params });
    return mapPlayback(dto);
  },

  async listSeries(params: CatalogListParams = {}): Promise<Page<TitleSummary>> {
    const dto = await get<PaginatedDto<SeriesListDto>>(endpoints.series.list, { params });
    return mapPage(dto, mapSeriesSummary);
  },

  async getSeries(id: number | string, locale?: string): Promise<TitleDetail> {
    const dto = await get<SeriesDetailDto>(endpoints.series.detail(id));
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
  async searchTitles(query: string, params: CatalogListParams = {}): Promise<TitleSummary[]> {
    const [movies, series] = await Promise.all([
      this.listMovies({ ...params, search: query }),
      this.listSeries({ ...params, search: query }),
    ]);
    return [...movies.items, ...series.items];
  },
};
