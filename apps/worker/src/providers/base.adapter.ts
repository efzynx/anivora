import {
  ContentProviderAdapter,
  NormalizedContentDetail,
  NormalizedSearchItem,
  ProviderConfig,
  ProviderHealthCheckResult,
  ProviderStatus,
  RawPlaybackStream,
} from '@anivora/types';
import { request } from 'undici';

export abstract class BaseProviderAdapter implements ContentProviderAdapter {
  abstract readonly config: ProviderConfig;

  protected readonly defaultHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  /**
   * Safe fetch with timeout and rate limiting support
   */
  protected async fetchHtml(url: string, customHeaders: Record<string, string> = {}): Promise<string> {
    const response = await request(url, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...customHeaders },
      headersTimeout: this.config.timeoutMs || 10000,
      bodyTimeout: this.config.timeoutMs || 10000,
    });

    if (response.statusCode >= 400) {
      throw new Error(`Provider HTTP Error [${this.config.id}]: ${response.statusCode} for ${url}`);
    }

    return await response.body.text();
  }

  abstract search(query: string): Promise<NormalizedSearchItem[]>;
  abstract getLatestUpdates(page: number): Promise<NormalizedSearchItem[]>;
  abstract getDetail(externalIdOrUrl: string): Promise<NormalizedContentDetail>;
  abstract resolvePlayback(episodeExternalUrl: string): Promise<RawPlaybackStream[]>;

  async checkHealth(): Promise<ProviderHealthCheckResult> {
    const startTime = Date.now();
    const targetUrl = this.config.healthCheckEndpoint || this.config.baseUrl;

    try {
      const response = await request(targetUrl, {
        method: 'GET',
        headers: this.defaultHeaders,
        headersTimeout: 5000,
        bodyTimeout: 5000,
      });

      const latency = Date.now() - startTime;
      const isOnline = response.statusCode >= 200 && response.statusCode < 400;

      return {
        providerId: this.config.id,
        status: isOnline ? (latency > 3000 ? ProviderStatus.DEGRADED : ProviderStatus.ONLINE) : ProviderStatus.DEGRADED,
        latencyMs: latency,
        checkedAt: new Date(),
      };
    } catch (err: any) {
      return {
        providerId: this.config.id,
        status: ProviderStatus.OFFLINE,
        latencyMs: Date.now() - startTime,
        checkedAt: new Date(),
        error: err?.message || 'Connection failed',
      };
    }
  }
}
