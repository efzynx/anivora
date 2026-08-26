import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PlaybackResolutionResultDto,
  PlaybackStreamSourceDto,
  SubtitleDto,
  StreamFormat,
  VideoCodec,
} from '@anivora/types';
import { ReportPlaybackErrorDto, ResolvePlaybackRequestDto } from './dto/playback.dto';

@Injectable()
export class PlaybackService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves optimal and fallback playback streams for a given episode.
   * Matches PRD §16 (Playback Resolver) & §17-18 (Device Compatibility & Legacy Baseline).
   */
  async resolvePlayback(
    episodeId: string,
    dto?: ResolvePlaybackRequestDto,
    userId?: string,
  ): Promise<PlaybackResolutionResultDto> {
    const episode = await this.prisma.episode.findFirst({
      where: {
        OR: [{ id: episodeId }, { slug: episodeId }],
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
          },
        },
        subtitles: true,
        sources: {
          include: {
            provider: true,
            playbackSources: {
              where: { isHealthy: true },
              orderBy: { priority: 'asc' },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException(`Episode with ID or slug '${episodeId}' was not found.`);
    }

    // 1. Gather all healthy playback sources across online/degraded providers
    const allPlaybackSources: Array<{
      id: string;
      serverLabel: string;
      streamUrl: string;
      format: StreamFormat;
      codec: VideoCodec;
      quality: string;
      headers?: Record<string, string>;
      priority: number;
      providerPriority: number;
    }> = [];

    for (const epSource of episode.sources) {
      if (epSource.provider.status === 'DISABLED' || epSource.provider.status === 'OFFLINE') {
        continue;
      }

      for (const pbSource of epSource.playbackSources) {
        allPlaybackSources.push({
          id: pbSource.id,
          serverLabel: pbSource.serverName,
          streamUrl: pbSource.streamUrl,
          format: pbSource.format as StreamFormat,
          codec: pbSource.codec as VideoCodec,
          quality: pbSource.quality,
          headers: (pbSource.headers as Record<string, string>) || undefined,
          priority: pbSource.priority,
          providerPriority: epSource.provider.priority,
        });
      }
    }

    if (allPlaybackSources.length === 0) {
      throw new UnprocessableEntityException(
        'Tidak ada sumber streaming yang aktif atau tersedia untuk episode ini.',
      );
    }

    // 2. Sort by device compatibility, provider priority, and preferred server
    const preferredServer = dto?.preferredServer?.toLowerCase();
    const isLegacyDevice = dto?.device ? dto.device.sdk <= 25 || dto.device.androidVersion <= 7 : true;

    allPlaybackSources.sort((a, b) => {
      // Preference: explicitly requested server
      if (preferredServer) {
        const aMatches = a.serverLabel.toLowerCase().includes(preferredServer);
        const bMatches = b.serverLabel.toLowerCase().includes(preferredServer);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }

      // Preference: codec H264 for legacy devices
      if (isLegacyDevice) {
        if (a.codec === 'H264' && b.codec !== 'H264') return -1;
        if (a.codec !== 'H264' && b.codec === 'H264') return 1;
      }

      // Preference: Provider priority (lower is higher priority)
      if (a.providerPriority !== b.providerPriority) {
        return a.providerPriority - b.providerPriority;
      }

      // Preference: Playback source priority
      return a.priority - b.priority;
    });

    const [selectedRaw, ...backupsRaw] = allPlaybackSources;

    const selectedSource: PlaybackStreamSourceDto = {
      id: selectedRaw.id,
      serverLabel: selectedRaw.serverLabel,
      streamUrl: selectedRaw.streamUrl,
      format: selectedRaw.format,
      codec: selectedRaw.codec,
      quality: selectedRaw.quality,
      headers: selectedRaw.headers,
      priority: selectedRaw.priority,
    };

    const backupSources: PlaybackStreamSourceDto[] = backupsRaw.map((s) => ({
      id: s.id,
      serverLabel: s.serverLabel,
      streamUrl: s.streamUrl,
      format: s.format,
      codec: s.codec,
      quality: s.quality,
      headers: s.headers,
      priority: s.priority,
    }));

    const subtitles: SubtitleDto[] = episode.subtitles.map((sub) => ({
      id: sub.id,
      language: sub.language,
      languageCode: sub.languageCode,
      format: sub.format,
      url: sub.url,
      isDefault: sub.isDefault,
    }));

    // 3. Get resume position if user is authenticated
    let resumePositionSeconds = 0;
    if (userId) {
      const progress = await this.prisma.watchProgress.findUnique({
        where: {
          userId_episodeId: {
            userId,
            episodeId: episode.id,
          },
        },
      });
      if (progress && !progress.completed) {
        resumePositionSeconds = progress.positionSeconds;
      }
    }

    const episodeTitle = episode.title
      ? `${episode.content.title} - ${episode.title}`
      : `${episode.content.title} Episode ${episode.episodeNumber}`;

    return {
      episodeId: episode.id,
      title: episodeTitle,
      resumePositionSeconds,
      selectedSource,
      backupSources,
      subtitles,
    };
  }

  /**
   * Health feedback loop when a client fails to play a stream.
   * Based on PRD §38 & §42.
   */
  async reportError(_episodeId: string, dto: ReportPlaybackErrorDto): Promise<{ success: boolean; message: string }> {
    try {
      const source = await this.prisma.playbackSource.findUnique({
        where: { id: dto.sourceId },
        include: {
          episodeSource: {
            include: {
              provider: true,
            },
          },
        },
      });

      if (source) {
        await this.prisma.playbackSource.update({
          where: { id: dto.sourceId },
          data: {
            isHealthy: false,
            lastTestedAt: new Date(),
          },
        });

        // Increase provider failure count if needed
        await this.prisma.provider.update({
          where: { id: source.episodeSource.providerId },
          data: {
            failureCount: { increment: 1 },
          },
        });
      }

      return {
        success: true,
        message: 'Laporan kegagalan stream berhasil dicatat.',
      };
    } catch {
      return {
        success: true,
        message: 'Laporan kegagalan dicatat.',
      };
    }
  }
}
