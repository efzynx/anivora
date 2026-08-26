import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ContentEpisodesQueryDto } from './dto/content-episodes.dto';
import { ApiResponseMeta, EpisodeDto } from '@anivora/types';

@Injectable()
export class EpisodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findEpisodesByContent(
    slugOrId: string,
    query: ContentEpisodesQueryDto,
  ): Promise<{ data: EpisodeDto[]; meta: ApiResponseMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const order = query.order ?? 'asc';
    const skip = (page - 1) * limit;

    const content = await this.prisma.content.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      select: { id: true },
    });

    if (!content) {
      throw new NotFoundException(`Content '${slugOrId}' was not found.`);
    }

    const [total, episodes] = await Promise.all([
      this.prisma.episode.count({
        where: { contentId: content.id },
      }),
      this.prisma.episode.findMany({
        where: { contentId: content.id },
        orderBy: { episodeNumber: order },
        skip,
        take: limit,
        include: {
          subtitles: {
            select: { id: true },
          },
        },
      }),
    ]);

    const data: EpisodeDto[] = episodes.map((ep) => ({
      id: ep.id,
      contentId: ep.contentId,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      slug: ep.slug,
      airDate: ep.airDate,
      durationSeconds: ep.durationSeconds,
      thumbnailUrl: ep.thumbnailUrl,
      hasSubtitles: ep.subtitles.length > 0,
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
}
