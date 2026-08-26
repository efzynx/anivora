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
 * Provider Adapter: Anichin (Live Donghua Scraper)
 * Scrapes real metadata and streaming servers from anichin.moe
 */
export class AnichinAdapter extends BaseProviderAdapter {
  readonly config: ProviderConfig = {
    id: 'prv_anichin',
    name: 'Anichin Provider',
    slug: 'anichin',
    baseUrl: 'https://anichin.moe',
    priority: 1,
    supportsAnime: false,
    supportsDonghua: true,
    rateLimitMs: 600,
    timeoutMs: 10000,
  };

  /**
   * Search donghua by keyword on anichin.moe
   */
  async search(query: string): Promise<NormalizedSearchItem[]> {
    const searchUrl = `${this.config.baseUrl}/?s=${encodeURIComponent(query)}`;
    const html = await this.fetchHtml(searchUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.listupd .bs').each((_, el) => {
      // Clean duplicate titles inside .tt span/h4
      const rawTitle = $(el).find('.tt, h4, h2').first().text().trim();
      const title = rawTitle.length > 0 ? rawTitle.slice(0, Math.ceil(rawTitle.length / 2)).trim() || rawTitle : '';
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');

      if (link) {
        const cleanLink = link.startsWith('http') ? link : `${this.config.baseUrl}${link}`;
        const externalId = cleanLink.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, '');

        results.push({
          externalId,
          externalUrl: cleanLink,
          title: title || externalId,
          posterUrl,
          type: ContentType.DONGHUA,
        });
      }
    });

    return results;
  }

  /**
   * Get latest released donghua episodes/series
   */
  async getLatestUpdates(page: number = 1): Promise<NormalizedSearchItem[]> {
    const targetUrl = page > 1 ? `${this.config.baseUrl}/ongoing/page/${page}/` : `${this.config.baseUrl}/ongoing/`;
    const html = await this.fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const results: NormalizedSearchItem[] = [];

    $('.listupd .bs').each((_, el) => {
      const rawTitle = $(el).find('.tt, h4, h2').first().text().trim();
      const title = rawTitle.length > 0 ? rawTitle.slice(0, Math.ceil(rawTitle.length / 2)).trim() || rawTitle : '';
      const link = $(el).find('a').first().attr('href') || '';
      const posterUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');

      if (link) {
        const cleanLink = link.startsWith('http') ? link : `${this.config.baseUrl}${link}`;
        const externalId = cleanLink.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, '');

        results.push({
          externalId,
          externalUrl: cleanLink,
          title: title || externalId,
          posterUrl,
          type: ContentType.DONGHUA,
        });
      }
    });

    return results;
  }

  /**
   * Get full Donghua series detail, metadata, and episode list
   */
  async getDetail(externalIdOrUrl: string): Promise<NormalizedContentDetail> {
    let fullUrl = externalIdOrUrl.startsWith('http')
      ? externalIdOrUrl
      : `${this.config.baseUrl}/${externalIdOrUrl.replace(/^\//, '')}`;

    if (!fullUrl.endsWith('/')) {
      fullUrl += '/';
    }

    let html = await this.fetchHtml(fullUrl);
    let $ = cheerio.load(html);

    // If an episode page was passed instead of series page, navigate to parent series URL
    if ($('.all-ep a, a.all-eps, .bignav a').length > 0 || fullUrl.includes('-episode-')) {
      const seriesLink = $('.all-ep a, a.all-eps, .ts-breadcrumb a').last().attr('href');
      if (seriesLink && seriesLink.startsWith('/')) {
        fullUrl = `${this.config.baseUrl}${seriesLink}`;
        html = await this.fetchHtml(fullUrl);
        $ = cheerio.load(html);
      }
    }

    const title = $('h1.entry-title').first().text().trim() || $('h1').first().text().trim();
    const nativeTitle = $('.alter, .alternative').first().text().trim() || undefined;
    const synopsis = $('.entry-content p, .synp .entry-content').first().text().trim() || undefined;
    const posterUrl = $('.thumb img, .bigcontent img').attr('src') || $('.thumb img').attr('data-src');
    const backdropUrl = $('.bigcover img').attr('src') || posterUrl;

    const ratingText = $('.rating strong, .num').first().text().replace(/[^\d.]/g, '').trim();
    const rating = ratingText ? parseFloat(ratingText) : undefined;

    // Genres
    const genres: string[] = [];
    $('.genxed a, .spe a[href*="/genres/"]').each((_, g) => {
      const genreName = $(g).text().trim();
      if (genreName && !genres.includes(genreName)) {
        genres.push(genreName);
      }
    });

    // Status
    const statusText = $('.spe span:contains("Status"), .info-content').text().toUpperCase();
    const status = statusText.includes('COMPLET') ? ContentStatus.COMPLETED : ContentStatus.ONGOING;

    // Episodes
    const episodes: NormalizedEpisodeItem[] = [];
    $('.eplister ul li, .episodelist ul li').each((idx, epEl) => {
      const epLink = $(epEl).find('a').attr('href') || '';
      const epNumText = $(epEl).find('.epl-num').text().trim();
      const epTitle = $(epEl).find('.epl-title').text().trim();
      const parsedNum = parseFloat(epNumText.replace(/[^\d.]/g, '')) || idx + 1;

      if (epLink) {
        const cleanEpLink = epLink.startsWith('http') ? epLink : `${this.config.baseUrl}${epLink}`;
        episodes.push({
          externalId: cleanEpLink.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
          externalUrl: cleanEpLink,
          episodeNumber: parsedNum,
          title: epTitle || `Episode ${parsedNum}`,
        });
      }
    });

    return {
      externalId: fullUrl.replace(this.config.baseUrl, '').replace(/^\/|\/$/g, ''),
      externalUrl: fullUrl,
      title,
      nativeTitle,
      altTitles: nativeTitle ? [nativeTitle] : [],
      synopsis,
      posterUrl,
      backdropUrl,
      type: ContentType.DONGHUA,
      status,
      rating,
      genres,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
    };
  }

  /**
   * Resolve multi-server playback stream for an episode
   */
  async resolvePlayback(episodeExternalUrl: string): Promise<RawPlaybackStream[]> {
    const fullUrl = episodeExternalUrl.startsWith('http')
      ? episodeExternalUrl
      : `${this.config.baseUrl}/${episodeExternalUrl.replace(/^\//, '')}`;

    const html = await this.fetchHtml(fullUrl);
    const $ = cheerio.load(html);
    const streams: RawPlaybackStream[] = [];

    // Parse base64-encoded mirror select options
    $('select.mirror option').each((idx, el) => {
      const serverLabel = $(el).text().trim();
      const base64Val = $(el).attr('value');

      if (base64Val) {
        try {
          const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
          const iframe$ = cheerio.load(decoded);
          const streamSrc = iframe$('iframe').attr('src');

          if (streamSrc && streamSrc.startsWith('http')) {
            streams.push({
              serverName: serverLabel || `Server ${idx + 1}`,
              streamUrl: streamSrc,
              format: streamSrc.includes('.m3u8') ? StreamFormat.HLS : StreamFormat.MP4,
              codec: VideoCodec.H264,
              quality: '720p',
              headers: {
                Referer: fullUrl,
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              priority: idx + 1,
            });
          }
        } catch {
          // ignore malformed base64
        }
      }
    });

    return streams;
  }
}
