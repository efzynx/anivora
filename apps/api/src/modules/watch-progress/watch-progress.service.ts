import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncProgressRequestDto } from './dto/sync-progress.dto';
import { WatchHistoryItemDto } from '@anivora/types';

@Injectable()
export class WatchProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async syncProgress(
    episodeId: string,
    userId: string,
    dto: SyncProgressRequestDto,
  ): Promise<{ success: boolean; positionSeconds: number; completed: boolean }> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, contentId: true },
    });

    if (!episode) {
      throw new NotFoundException(`Episode '${episodeId}' was not found.`);
    }

    const isCompleted =
      dto.completed ||
      (dto.durationSeconds > 0 &&
        dto.positionSeconds / dto.durationSeconds >= 0.9);

    // 1. Upsert Watch Progress
    await this.prisma.watchProgress.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId: episode.id,
        },
      },
      update: {
        positionSeconds: dto.positionSeconds,
        durationSeconds: dto.durationSeconds,
        completed: isCompleted,
        updatedAt: new Date(),
      },
      create: {
        userId,
        contentId: episode.contentId,
        episodeId: episode.id,
        positionSeconds: dto.positionSeconds,
        durationSeconds: dto.durationSeconds,
        completed: isCompleted,
      },
    });

    // 2. Record Watch History entry
    await this.prisma.watchHistory.create({
      data: {
        userId,
        contentId: episode.contentId,
        episodeId: episode.id,
        watchedAt: new Date(),
      },
    });

    return {
      success: true,
      positionSeconds: dto.positionSeconds,
      completed: isCompleted,
    };
  }

  async getHistory(userId: string, limit = 30): Promise<WatchHistoryItemDto[]> {
    const history = await this.prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { watchedAt: 'desc' },
      take: limit,
      include: {
        content: true,
        episode: true,
      },
    });

    return history.map((h) => ({
      id: h.id,
      contentId: h.contentId,
      contentTitle: h.content.title,
      contentSlug: h.content.slug,
      posterUrl: h.content.posterUrl,
      episodeId: h.episodeId,
      episodeNumber: h.episode.episodeNumber,
      episodeTitle: h.episode.title,
      watchedAt: h.watchedAt,
    }));
  }
}
