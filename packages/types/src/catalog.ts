import { ContentStatus, ContentType, ContentSummaryDto } from './domain';

/**
 * Catalog & Search Query Parameters DTO
 * Based on docs/API.md
 */

export type CatalogSort = 'popular' | 'latest' | 'rating' | 'title';

export interface BrowseCatalogQueryDto {
  type?: ContentType;
  genre?: string;
  status?: ContentStatus;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}

export type CatalogItemDto = ContentSummaryDto;

export type SearchType = 'ALL' | ContentType;


export interface SearchQueryDto {
  q: string;
  type?: SearchType;
  limit?: number;
}

export type EpisodeOrder = 'asc' | 'desc';

export interface ContentEpisodesQueryDto {
  page?: number;
  limit?: number;
  order?: EpisodeOrder;
}
