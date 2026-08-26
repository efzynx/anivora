import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ContentSummaryDto, ContentType, ContentStatus } from '@anivora/types';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFavorites(userId: string): Promise<ContentSummaryDto[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        content: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
      },
    });

    return favorites.map((f) => ({
      id: f.content.id,
      slug: f.content.slug,
      title: f.content.title,
      type: f.content.type as ContentType,
      posterUrl: f.content.posterUrl,
      backdropUrl: f.content.backdropUrl,
      releaseYear: f.content.releaseYear,
      rating: f.content.rating,
      status: f.content.status as ContentStatus,
      totalEpisodes: f.content.totalEpisodes,
      genres: f.content.genres.map((g) => g.genre.name),
    }));
  }

  async addFavorite(userId: string, contentId: string): Promise<{ success: boolean; message: string }> {
    const content = await this.prisma.content.findFirst({
      where: {
        OR: [{ id: contentId }, { slug: contentId }],
      },
      select: { id: true },
    });

    if (!content) {
      throw new NotFoundException(`Content '${contentId}' was not found.`);
    }

    await this.prisma.favorite.upsert({
      where: {
        userId_contentId: {
          userId,
          contentId: content.id,
        },
      },
      update: {},
      create: {
        userId,
        contentId: content.id,
      },
    });

    return {
      success: true,
      message: 'Content added to favorites.',
    };
  }

  async removeFavorite(userId: string, contentId: string): Promise<{ success: boolean; message: string }> {
    const content = await this.prisma.content.findFirst({
      where: {
        OR: [{ id: contentId }, { slug: contentId }],
      },
      select: { id: true },
    });

    if (!content) {
      throw new NotFoundException(`Content '${contentId}' was not found.`);
    }

    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        contentId: content.id,
      },
    });

    return {
      success: true,
      message: 'Content removed from favorites.',
    };
  }
}
