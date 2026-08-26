import { ContentSummaryDto, ContentType, ContentStatus } from './domain';

/**
 * TV Home Rails & Discovery DTOs
 * Based on docs/API.md & docs/DESIGN.md
 */

export interface ContinueWatchingItemDto {
  contentId: string;
  slug: string;
  title: string;
  posterUrl?: string | null;
  episodeId: string;
  episodeNumber: number;
  positionSeconds: number;
  durationSeconds: number;
  progressPercentage: number;
}

export type RailType = 'EPISODE_RAIL' | 'CONTENT_RAIL';

export interface EpisodeRailItemDto {
  contentId: string;
  slug: string;
  title: string;
  episodeId: string;
  episodeNumber: number;
  posterUrl?: string | null;
  releasedAt?: string | Date | null;
}

export interface HomeRailItemDto {
  id?: string;
  slug?: string;
  title: string;
  type?: ContentType | string;
  status?: ContentStatus | string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  episodeId?: string;
  episodeNumber?: number;
  progressPercentage?: number;
  rating?: number | null;
}

export type HeroItemDto = ContentSummaryDto;

export type SectionRailItem = EpisodeRailItemDto | ContentSummaryDto | HomeRailItemDto;

export interface HomeSectionDto {
  id: string;
  title: string;
  type: RailType;
  items: HomeRailItemDto[];
}

export type HomeRailSectionDto = HomeSectionDto;

export interface HomeFeedDto {
  hero: ContentSummaryDto[];
  continueWatching: ContinueWatchingItemDto[];
  sections: HomeSectionDto[];
}

export type HomeFeedResponseDto = HomeFeedDto;

