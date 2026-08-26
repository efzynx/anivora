import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  HomeFeedDto,
  ContentSummaryDto,
  ContinueWatchingItemDto,
  ContentType,
  ContentStatus,
  HomeSectionDto,
} from '@anivora/types';

@Injectable()
export class HomepageService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeFeed(userId?: string): Promise<HomeFeedDto> {
    // 1. Fetch Hero Banners (Featured / High Popularity)
    const heroContents = await this.prisma.content.findMany({
      where: {
        isFeatured: true,
      },
      take: 5,
      orderBy: { popularity: 'desc' },
      include: {
        genres: {
          include: { genre: true },
        },
        episodes: {
          orderBy: { episodeNumber: 'desc' },
          take: 1,
        },
      },
    });

    const hero: ContentSummaryDto[] = heroContents.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      type: c.type as ContentType,
      posterUrl: c.posterUrl,
      backdropUrl: c.backdropUrl,
      synopsis: c.synopsis,
      rating: c.rating,
      genres: c.genres.map((g) => g.genre.name),
      latestEpisode: c.episodes[0]?.episodeNumber ?? undefined,
    }));

    // 2. Fetch Continue Watching (if userId provided)
    let continueWatching: ContinueWatchingItemDto[] = [];
    if (userId) {
      const progressList = await this.prisma.watchProgress.findMany({
        where: {
          userId,
          completed: false,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          content: true,
          episode: true,
        },
      });

      continueWatching = progressList.map((p) => {
        const percentage =
          p.durationSeconds > 0
            ? Math.round((p.positionSeconds / p.durationSeconds) * 100)
            : 0;

        return {
          contentId: p.contentId,
          slug: p.content.slug,
          title: p.content.title,
          posterUrl: p.content.posterUrl,
          episodeId: p.episodeId,
          episodeNumber: p.episode.episodeNumber,
          positionSeconds: p.positionSeconds,
          durationSeconds: p.durationSeconds,
          progressPercentage: percentage,
        };
      });
    }

    // 3. Fetch Sections: Latest Episodes, Popular Anime, Popular Donghua
    const [latestEpisodes, popularAnime, popularDonghua] = await Promise.all([
      // Latest Episodes
      this.prisma.episode.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          content: true,
        },
      }),
      // Popular Anime
      this.prisma.content.findMany({
        where: { type: ContentType.ANIME },
        orderBy: { popularity: 'desc' },
        take: 15,
      }),
      // Popular Donghua
      this.prisma.content.findMany({
        where: { type: ContentType.DONGHUA },
        orderBy: { popularity: 'desc' },
        take: 15,
        include: {
          episodes: {
            orderBy: { episodeNumber: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const sections: HomeSectionDto[] = [
      {
        id: 'sec_latest_episodes',
        title: 'Latest Episodes',
        type: 'EPISODE_RAIL',
        items: latestEpisodes.map((ep) => ({
          contentId: ep.contentId,
          slug: ep.content.slug,
          title: ep.title || `${ep.content.title} Ep ${ep.episodeNumber}`,
          episodeId: ep.id,
          episodeNumber: ep.episodeNumber,
          posterUrl: ep.thumbnailUrl || ep.content.posterUrl,
          releasedAt: ep.airDate || ep.createdAt,
        })),
      },
      {
        id: 'sec_popular_anime',
        title: 'Popular Anime',
        type: 'CONTENT_RAIL',
        items: popularAnime.map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          posterUrl: c.posterUrl,
          type: c.type as ContentType,
          status: c.status as ContentStatus,
          totalEpisodes: c.totalEpisodes,
          rating: c.rating,
        })),
      },
      {
        id: 'sec_popular_donghua',
        title: 'Popular Donghua',
        type: 'CONTENT_RAIL',
        items: popularDonghua.map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          posterUrl: c.posterUrl,
          type: c.type as ContentType,
          status: c.status as ContentStatus,
          latestEpisode: c.episodes[0]?.episodeNumber ?? undefined,
          totalEpisodes: c.totalEpisodes,
          rating: c.rating,
        })),
      },
    ];

    return {
      hero,
      continueWatching,
      sections,
    };
  }
}
