import { Controller, Get, Param, Query } from '@nestjs/common';
import { EpisodesService } from './episodes.service';
import { ContentEpisodesQueryDto } from './dto/content-episodes.dto';
import { ApiResponseMeta, EpisodeDto } from '@anivora/types';

@Controller('contents/:slugOrId/episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get()
  async getContentEpisodes(
    @Param('slugOrId') slugOrId: string,
    @Query() query: ContentEpisodesQueryDto,
  ): Promise<{ data: EpisodeDto[]; meta: ApiResponseMeta }> {
    return this.episodesService.findEpisodesByContent(slugOrId, query);
  }
}
