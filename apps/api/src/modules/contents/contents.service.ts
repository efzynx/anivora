import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BrowseCatalogDto } from './dto/browse-catalog.dto';
import {
  ContentDetailDto,
  ContentSummaryDto,
  ApiResponseMeta,
  ContentType,
  ContentStatus,
} from '@anivora/types';
import { Prisma } from '@anivora/database';

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async browse(query: BrowseCatalogDto): Promise<{
    data: ContentSummaryDto[];
    meta: ApiResponseMeta;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = {};

    if (query.type) {
      where.type = query.type as ContentType;
    }

    if (query.status) {
      where.status = query.status as ContentStatus;
    }

    if (query.genre) {
      where.genres = {
        some: {
          genre: {
            slug: query.genre,
          },
        },
      };
    }

    let orderBy: Prisma.ContentOrderByWithRelationInput = { popularity: 'desc' };
    if (query.sort === 'latest') {
      orderBy = { createdAt: 'desc' };
    } else if (query.sort === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (query.sort === 'title') {
      orderBy = { title: 'asc' };
    }

    const [total, contents] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          genres: {
            include: {
              genre: true,
            },
          },
        },
      }),
    ]);

    const data: ContentSummaryDto[] = contents.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      type: c.type as ContentType,
      posterUrl: c.posterUrl,
      backdropUrl: c.backdropUrl,
      releaseYear: c.releaseYear,
      rating: c.rating,
      status: c.status as ContentStatus,
      totalEpisodes: c.totalEpisodes,
      synopsis: c.synopsis,
      genres: c.genres.map((g) => g.genre.name),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findBySlugOrId(
    slugOrId: string,
    userId?: string,
  ): Promise<ContentDetailDto> {
    const content = await this.prisma.content.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content '${slugOrId}' was not found.`);
    }

    let isFavorite = false;
    let lastWatchedEpisode: {
      episodeNumber: number;
      positionSeconds: number;
    } | null = null;

    if (userId) {
      const [favorite, progress] = await Promise.all([
        this.prisma.favorite.findUnique({
          where: {
            userId_contentId: {
              userId,
              contentId: content.id,
            },
          },
        }),
        this.prisma.watchProgress.findFirst({
          where: {
            userId,
            contentId: content.id,
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            episode: true,
          },
        }),
      ]);

      isFavorite = !!favorite;
      if (progress && progress.episode) {
        lastWatchedEpisode = {
          episodeNumber: progress.episode.episodeNumber,
          positionSeconds: progress.positionSeconds,
        };
      }
    }

    return {
      id: content.id,
      slug: content.slug,
      title: content.title,
      nativeTitle: content.nativeTitle,
      altTitles: content.altTitles,
      type: content.type as ContentType,
      status: content.status as ContentStatus,
      releaseYear: content.releaseYear,
      synopsis: content.synopsis,
      posterUrl: content.posterUrl,
      backdropUrl: content.backdropUrl,
      rating: content.rating,
      genres: content.genres.map((g) => ({
        id: g.genre.id,
        name: g.genre.name,
        slug: g.genre.slug,
      })),
      totalEpisodes: content.totalEpisodes,
      isFavorite,
      lastWatchedEpisode,
    };
  }
}
