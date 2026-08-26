/**
 * Core Domain Enums and Interfaces
 * Canonical models matching PostgreSQL / Prisma Schema in docs/DATABASE.md
 */

export enum ContentType {
  ANIME = 'ANIME',
  DONGHUA = 'DONGHUA',
}

export enum ContentStatus {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  UPCOMING = 'UPCOMING',
  HIATUS = 'HIATUS',
}

export enum ProviderStatus {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
  DISABLED = 'DISABLED',
}

export enum StreamFormat {
  HLS = 'HLS',
  MP4 = 'MP4',
  DASH = 'DASH',
}

export enum VideoCodec {
  H264 = 'H264',
  H265 = 'H265',
  VP9 = 'VP9',
  AV1 = 'AV1',
}

export interface GenreDto {
  id: string;
  name: string;
  slug: string;
}

export interface ContentSummaryDto {
  id: string;
  slug: string;
  title: string;
  type: ContentType;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  status?: ContentStatus;
  totalEpisodes?: number;
  latestEpisode?: number;
  genres?: string[];
  synopsis?: string | null;
}

export interface ContentDetailDto {
  id: string;
  slug: string;
  title: string;
  nativeTitle?: string | null;
  altTitles: string[];
  type: ContentType;
  status: ContentStatus;
  releaseYear?: number | null;
  synopsis?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  genres: GenreDto[];
  totalEpisodes: number;
  isFavorite?: boolean;
  lastWatchedEpisode?: {
    episodeNumber: number;
    positionSeconds: number;
  } | null;
}

export interface EpisodeDto {
  id: string;
  contentId: string;
  episodeNumber: number;
  title?: string | null;
  slug: string;
  airDate?: string | Date | null;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  hasSubtitles: boolean;
}

export type EpisodeItemDto = EpisodeDto;

