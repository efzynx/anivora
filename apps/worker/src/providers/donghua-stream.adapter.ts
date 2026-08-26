import * as cheerio from 'cheerio';
import {
  ContentStatus,
  ContentType,
  NormalizedContentDetail,
  NormalizedEpisodeItem,
  NormalizedSearchItem,
  ProviderConfig,
  RawPlaybackStream,
  StreamFormat,
  VideoCodec,
} from '@anivora/types';
import { BaseProviderAdapter } from './base.adapter';

/**
 * Provider B: Donghua Stream Dedicated Adapter
 * Compliant with modular architecture in docs/SCRAPER.md and docs/PROVIDERS.md
 */
export class DonghuaStreamAdapter extends BaseProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'prv_donghua_stream',
    name: 'Donghua Stream Hub',
    slug: 'donghua-stream',
    baseUrl: 'https://donghuastream.example',
    priority: 1,
    supportsAnime: false,
    supportsDonghua: true,
    rateLimitMs: 600,
    timeoutMs: 8000,
  };

  async search(query: string): Promise<NormalizedSearchItem[]> {
    const searchUrl = `${this.config.baseUrl}/search?q=${encodeURIComponent(query)}`;
    const html = await this.fetchHtml(searchUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.donghua-grid-item, .post-item').each((_, el) => {
      const title = $(el).find('.title-donghua, h3').text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');

      if (title && link) {
        results.push({
          externalId: link.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: link.startsWith('http') ? link : `${this.config.baseUrl}/${link.replace(/^\//, '')}`,
          title,
          posterUrl,
          type: ContentType.DONGHUA,
        });
      }
    });

    return results;
  }

  async getLatestUpdates(page: number = 1): Promise<NormalizedSearchItem[]> {
    const targetUrl = `${this.config.baseUrl}/ongoing?page=${page}`;
    const html = await this.fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.latest-donghua-item').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

      if (title && link) {
        results.push({
          externalId: link.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: link.startsWith('http') ? link : `${this.config.baseUrl}/${link.replace(/^\//, '')}`,
          title,
          posterUrl,
          type: ContentType.DONGHUA,
        });
      }
    });

    return results;
  }

  async getDetail(externalIdOrUrl: string): Promise<NormalizedContentDetail> {
    const fullUrl = externalIdOrUrl.startsWith('http')
      ? externalIdOrUrl
      : `${this.config.baseUrl}/${externalIdOrUrl.replace(/^\//, '')}`;

    const html = await this.fetchHtml(fullUrl);
    const $ = cheerio.load(html);

    const title = $('.donghua-info h1, .entry-title').first().text().trim();
    const nativeTitle = $('.chinese-title, .alt-title').text().trim() || undefined;
    const synopsis = $('.synopsis-text, .storyline').text().trim() || undefined;
    const posterUrl = $('.poster-wrap img').attr('src') || $('.poster-wrap img').attr('data-src');
    const backdropUrl = $('.cover-wrap img').attr('src') || posterUrl;

    const genres: string[] = [];
    $('.tag-cloud a, .genres a').each((_, g) => {
      const genreName = $(g).text().trim();
      if (genreName) genres.push(genreName);
    });

    const episodes: NormalizedEpisodeItem[] = [];
    $('.episodes-grid a, .ep-list a').each((idx, epEl) => {
      const epLink = $(epEl).attr('href') || '';
      const epText = $(epEl).text().trim();
      const parsedNum = parseFloat(epText.replace(/[^\d.]/g, '')) || idx + 1;

      if (epLink) {
        episodes.push({
          externalId: epLink.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: epLink.startsWith('http') ? epLink : `${this.config.baseUrl}/${epLink.replace(/^\//, '')}`,
          episodeNumber: parsedNum,
          title: `Episode ${parsedNum}`,
        });
      }
    });

    return {
      externalId: externalIdOrUrl.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
      externalUrl: fullUrl,
      title,
      nativeTitle,
      altTitles: [],
      synopsis,
      posterUrl,
      backdropUrl,
      type: ContentType.DONGHUA,
      status: ContentStatus.ONGOING,
      genres,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
    };
  }

  async resolvePlayback(episodeExternalUrl: string): Promise<RawPlaybackStream[]> {
    const html = await this.fetchHtml(episodeExternalUrl);
    const $ = cheerio.load(html);
    const streams: RawPlaybackStream[] = [];

    // Extract stream servers
    $('button.stream-server, a.server-btn').each((idx, el) => {
      const serverName = $(el).text().trim() || `Donghua Server ${idx + 1}`;
      const streamUrl = $(el).attr('data-url') || $(el).attr('data-embed') || '';

      if (streamUrl && streamUrl.startsWith('http')) {
        streams.push({
          serverName,
          streamUrl,
          format: StreamFormat.HLS,
          codec: VideoCodec.H264,
          quality: '720p',
          headers: {
            Referer: this.config.baseUrl,
          },
          priority: idx + 1,
        });
      }
    });

    return streams;
  }
}
