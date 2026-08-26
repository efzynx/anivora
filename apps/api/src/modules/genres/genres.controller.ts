import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenreDto } from '@anivora/types';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  async getAllGenres(): Promise<GenreDto[]> {
    return this.genresService.findAll();
  }

  @Get(':slug')
  async getGenreBySlug(@Param('slug') slug: string): Promise<GenreDto> {
    const genre = await this.genresService.findBySlug(slug);
    if (!genre) {
      throw new NotFoundException(`Genre with slug '${slug}' was not found.`);
    }
    return genre;
  }
}
