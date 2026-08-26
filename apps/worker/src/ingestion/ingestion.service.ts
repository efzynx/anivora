import { PrismaClient } from '@anivora/database';
import { NormalizedContentDetail, NormalizedEpisodeItem } from '@anivora/types';
import { ContentNormalizer } from './normalizer';

/**
 * Ingestion Engine - Deduplication & Upsert Pipeline
 */
export class IngestionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Ingest or update content from a provider adapter into canonical database
   */
  async ingestContent(
    providerId: string,
    rawDetail: NormalizedContentDetail,
  ): Promise<{ contentId: string; created: boolean; updated: boolean }> {
    const cleanedTitle = ContentNormalizer.cleanTitle(rawDetail.title);
    const baseSlug = ContentNormalizer.slugify(cleanedTitle);

    // 1. Check if external mapping already exists for this provider
    const existingSource = await this.prisma.contentSource.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: rawDetail.externalId,
        },
      },
      include: { content: true },
    });

    if (existingSource) {
      // Content already tracked, update episodes and metadata
      await this.updateContentEpisodes(existingSource.contentId, providerId, rawDetail.episodes);
      return { contentId: existingSource.contentId, created: false, updated: true };
    }

    // 2. Deduplication check: Match against canonical titles using Trigram / fuzzy heuristic
    const candidateContents = await this.prisma.content.findMany({
      where: {
        type: rawDetail.type,
        ...(rawDetail.releaseYear ? { releaseYear: rawDetail.releaseYear } : {}),
      },
      take: 20,
    });

    let matchedContent = candidateContents.find((c) => {
      const sim = ContentNormalizer.calculateSimilarity(c.title, cleanedTitle);
      return sim >= 0.88;
    });

    let isCreated = false;
    let contentId: string;

    if (matchedContent) {
      contentId = matchedContent.id;
    } else {
      // Create new canonical content
      isCreated = true;
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await this.prisma.content.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Upsert Genres
      const genreConnections: { genreId: string }[] = [];
      for (const gName of rawDetail.genres) {
        const gSlug = ContentNormalizer.slugify(gName);
        if (gSlug) {
          const genre = await this.prisma.genre.upsert({
            where: { slug: gSlug },
            create: { name: gName, slug: gSlug },
            update: {},
          });
          genreConnections.push({ genreId: genre.id });
        }
      }

      const created = await this.prisma.content.create({
        data: {
          title: cleanedTitle,
          nativeTitle: rawDetail.nativeTitle,
          altTitles: rawDetail.altTitles,
          slug: uniqueSlug,
          type: rawDetail.type,
          status: rawDetail.status,
          releaseYear: rawDetail.releaseYear,
          synopsis: rawDetail.synopsis,
          posterUrl: rawDetail.posterUrl,
          backdropUrl: rawDetail.backdropUrl,
          totalEpisodes: rawDetail.episodes.length,
          genres: {
            create: genreConnections.map((gc) => ({
              genre: { connect: { id: gc.genreId } },
            })),
          },
        },
      });

      contentId = created.id;
    }

    // 3. Register ContentSource mapping
    await this.prisma.contentSource.upsert({
      where: {
        providerId_externalId: {
          providerId,
          externalId: rawDetail.externalId,
        },
      },
      create: {
        contentId,
        providerId,
        externalId: rawDetail.externalId,
        externalUrl: rawDetail.externalUrl,
        lastSyncedAt: new Date(),
      },
      update: {
        lastSyncedAt: new Date(),
      },
    });

    // 4. Ingest Episodes
    await this.updateContentEpisodes(contentId, providerId, rawDetail.episodes);

    return { contentId, created: isCreated, updated: !isCreated };
  }

  private async updateContentEpisodes(
    contentId: string,
    providerId: string,
    episodes: NormalizedEpisodeItem[],
  ): Promise<void> {
    for (const ep of episodes) {
      const epSlug = `ep-${ep.episodeNumber}`;

      // Upsert canonical episode record
      const canonicalEpisode = await this.prisma.episode.upsert({
        where: {
          slug: `${contentId}-${epSlug}`,
        },
        create: {
          contentId,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          slug: `${contentId}-${epSlug}`,
          airDate: ep.airDate,
        },
        update: {
          airDate: ep.airDate,
        },
      });

      // Upsert episode source mapping
      await this.prisma.episodeSource.upsert({
        where: {
          providerId_externalId: {
            providerId,
            externalId: ep.externalId,
          },
        },
        create: {
          episodeId: canonicalEpisode.id,
          providerId,
          externalId: ep.externalId,
          externalUrl: ep.externalUrl,
          lastSyncedAt: new Date(),
        },
        update: {
          lastSyncedAt: new Date(),
        },
      });
    }

    // Update total episodes count
    const total = await this.prisma.episode.count({ where: { contentId } });
    await this.prisma.content.update({
      where: { id: contentId },
      data: { totalEpisodes: total },
    });
  }
}
