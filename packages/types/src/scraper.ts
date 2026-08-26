import { ContentStatus, ContentType, ProviderStatus, StreamFormat, VideoCodec } from './domain';

/**
 * Normalization & Ingestion Adapter Contracts
 * Based on docs/SCRAPER.md & docs/PROVIDERS.md
 */

export interface ProviderConfig {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  priority: number; // 1 = Highest
  supportsAnime: boolean;
  supportsDonghua: boolean;
  rateLimitMs: number;
  healthCheckEndpoint?: string;
  timeoutMs: number;
}

export interface ProviderHealthCheckResult {
  providerId: string;
  status: ProviderStatus;
  latencyMs: number;
  checkedAt: Date;
  error?: string;
}

export interface NormalizedSearchItem {
  externalId: string;
  externalUrl: string;
  title: string;
  posterUrl?: string;
  type: ContentType;
  releaseYear?: number;
}

export interface NormalizedEpisodeItem {
  externalId: string;
  externalUrl: string;
  episodeNumber: number;
  title?: string;
  airDate?: Date;
}

export interface NormalizedContentDetail {
  externalId: string;
  externalUrl: string;
  title: string;
  nativeTitle?: string;
  altTitles: string[];
  synopsis?: string;
  posterUrl?: string;
  backdropUrl?: string;
  type: ContentType;
  status: ContentStatus;
  releaseYear?: number;
  rating?: number;
  genres: string[];
  episodes: NormalizedEpisodeItem[];
}

export interface RawPlaybackStream {
  serverName: string;
  streamUrl: string;
  format: StreamFormat;
  codec: VideoCodec;
  quality: string;
  headers?: Record<string, string>;
  priority: number;
}

export interface ContentProviderAdapter {
  readonly config: ProviderConfig;

  search(query: string): Promise<NormalizedSearchItem[]>;
  getLatestUpdates(page: number): Promise<NormalizedSearchItem[]>;
  getDetail(externalIdOrUrl: string): Promise<NormalizedContentDetail>;
  resolvePlayback(episodeExternalUrl: string): Promise<RawPlaybackStream[]>;
  checkHealth(): Promise<ProviderHealthCheckResult>;
}

export interface IngestionJobResult {
  jobId: string;
  providerId: string;
  jobType: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  durationMs: number;
  errors: string[];
}
