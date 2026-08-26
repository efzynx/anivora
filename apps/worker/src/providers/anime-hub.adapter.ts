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
 * Provider A: Primary Anime Hub Scraper Adapter
 * Compliant with modular architecture in docs/SCRAPER.md and docs/PROVIDERS.md
 */
export class AnimeHubAdapter extends BaseProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'prv_anime_hub',
    name: 'Anime Hub Primary',
    slug: 'anime-hub',
    baseUrl: 'https://animehub.example',
    priority: 1,
    supportsAnime: true,
    supportsDonghua: false,
    rateLimitMs: 500,
    timeoutMs: 8000,
  };

  async search(query: string): Promise<NormalizedSearchItem[]> {
    const searchUrl = `${this.config.baseUrl}/?s=${encodeURIComponent(query)}`;
    const html = await this.fetchHtml(searchUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.search-item, article.anime-card').each((_, el) => {
      const title = $(el).find('.title, h2').text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');
      const yearText = $(el).find('.year, .release').text().trim();
      const releaseYear = yearText ? parseInt(yearText, 10) : undefined;

      if (title && link) {
        results.push({
          externalId: link.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: link.startsWith('http') ? link : `${this.config.baseUrl}/${link.replace(/^\//, '')}`,
          title,
          posterUrl,
          type: ContentType.ANIME,
          releaseYear: !isNaN(releaseYear!) ? releaseYear : undefined,
        });
      }
    });

    return results;
  }

  async getLatestUpdates(_page: number = 1): Promise<NormalizedSearchItem[]> {
    const targetUrl = `${this.config.baseUrl}/latest-releases?page=${_page}`;
    const html = await this.fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.latest-item, article.post').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

      if (title && link) {
        results.push({
          externalId: link.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: link.startsWith('http') ? link : `${this.config.baseUrl}/${link.replace(/^\//, '')}`,
          title,
          posterUrl,
          type: ContentType.ANIME,
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

    const title = $('.entry-title, .anime-title, h1').first().text().trim();
    const nativeTitle = $('.native-title, .japanese-title').text().trim() || undefined;
    const synopsis = $('.synopsis, .entry-content p, .desc').text().trim() || undefined;
    const posterUrl = $('.poster img, .thumb img').attr('src') || $('.poster img').attr('data-src');
    const backdropUrl = $('.backdrop img, .cover img').attr('src') || posterUrl;
    
    // Genres extraction
    const genres: string[] = [];
    $('.genres a, .genre a').each((_, g) => {
      const genreName = $(g).text().trim();
      if (genreName) genres.push(genreName);
    });

    // Status
    const statusText = $('.status, .info-status').text().toUpperCase();
    const status = statusText.includes('COMPLET') ? ContentStatus.COMPLETED : ContentStatus.ONGOING;

    // Episodes
    const episodes: NormalizedEpisodeItem[] = [];
    $('.episode-list li, .eplister li').each((_, epEl) => {
      const epLink = $(epEl).find('a').attr('href') || '';
      const epTitle = $(epEl).find('.epl-title, .title').text().trim();
      const epNumText = $(epEl).find('.epl-num, .num').text().trim();
      const parsedNum = parseFloat(epNumText.replace(/[^\d.]/g, '')) || episodes.length + 1;

      if (epLink) {
        episodes.push({
          externalId: epLink.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: epLink.startsWith('http') ? epLink : `${this.config.baseUrl}/${epLink.replace(/^\//, '')}`,
          episodeNumber: parsedNum,
          title: epTitle || `Episode ${parsedNum}`,
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
      type: ContentType.ANIME,
      status,
      genres,
      episodes: episodes.reverse(), // chronologically ordered (ep 1, ep 2...)
    };
  }

  async resolvePlayback(episodeExternalUrl: string): Promise<RawPlaybackStream[]> {
    const html = await this.fetchHtml(episodeExternalUrl);
    const $ = cheerio.load(html);
    const streams: RawPlaybackStream[] = [];

    // Extract iframe stream embeds or direct player links
    $('select.mirror-server option, .server-item').each((idx, el) => {
      const serverName = $(el).text().trim() || `Server ${idx + 1}`;
      const streamUrl = $(el).attr('value') || $(el).attr('data-src') || '';

      if (streamUrl && streamUrl.startsWith('http')) {
        streams.push({
          serverName,
          streamUrl,
          format: streamUrl.includes('.m3u8') ? StreamFormat.HLS : StreamFormat.MP4,
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
