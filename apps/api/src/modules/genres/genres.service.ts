import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GenreDto } from '@anivora/types';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<GenreDto[]> {
    const genres = await this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return genres;
  }

  async findBySlug(slug: string): Promise<GenreDto | null> {
    return this.prisma.genre.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }
}
