import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { ContentSummaryDto, ContentType, ContentStatus } from '@anivora/types';
import { Prisma } from '@anivora/database';

interface RawSearchRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  poster_url: string | null;
  release_year: number | null;
  rating: number | null;
  status: string;
  similarity?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(queryDto: SearchQueryDto): Promise<ContentSummaryDto[]> {
    const rawQuery = queryDto.q.trim();
    if (!rawQuery) {
      return [];
    }

    const limit = queryDto.limit ?? 20;
    const typeFilter = queryDto.type && queryDto.type !== 'ALL' ? queryDto.type : null;

    try {
      // 1. First attempt: PostgreSQL pg_trgm similarity search
      let typeClause = Prisma.sql``;
      if (typeFilter) {
        typeClause = Prisma.sql`AND type = ${typeFilter}::"ContentType"`;
      }

      const rows = await this.prisma.$queryRaw<RawSearchRow[]>`
        SELECT 
          id, slug, title, type, poster_url, release_year, rating, status,
          GREATEST(
            similarity(title, ${rawQuery}),
            similarity(COALESCE(native_title, ''), ${rawQuery})
          ) as similarity
        FROM contents
        WHERE (
          title % ${rawQuery}
          OR native_title % ${rawQuery}
          OR title ILIKE ${'%' + rawQuery + '%'}
          OR native_title ILIKE ${'%' + rawQuery + '%'}
        )
        ${typeClause}
        ORDER BY similarity DESC, popularity DESC
        LIMIT ${limit};
      `;

      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        type: r.type as ContentType,
        posterUrl: r.poster_url,
        releaseYear: r.release_year,
        rating: r.rating,
        status: r.status as ContentStatus,
      }));
    } catch (error) {
      this.logger.warn(
        `Trigram search failed or extension unavailable, falling back to ILIKE query: ${error}`,
      );

      // 2. Fallback: Standard Prisma ILIKE search
      const where: Prisma.ContentWhereInput = {
        OR: [
          { title: { contains: rawQuery, mode: 'insensitive' } },
          { nativeTitle: { contains: rawQuery, mode: 'insensitive' } },
          { altTitles: { has: rawQuery } },
        ],
      };

      if (typeFilter) {
        where.type = typeFilter as ContentType;
      }

      const contents = await this.prisma.content.findMany({
        where,
        take: limit,
        orderBy: { popularity: 'desc' },
      });

      return contents.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        type: c.type as ContentType,
        posterUrl: c.posterUrl,
        releaseYear: c.releaseYear,
        rating: c.rating,
        status: c.status as ContentStatus,
      }));
    }
  }
}
