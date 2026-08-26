import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { BrowseCatalogDto } from './dto/browse-catalog.dto';
import { ContentDetailDto, ContentSummaryDto, ApiResponseMeta, UserProfileDto } from '@anivora/types';
import { OptionalJwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get()
  async browseCatalog(
    @Query() query: BrowseCatalogDto,
  ): Promise<{ data: ContentSummaryDto[]; meta: ApiResponseMeta }> {
    return this.contentsService.browse(query);
  }

  @Get(':slugOrId')
  @UseGuards(OptionalJwtAuthGuard)
  async getContentDetail(
    @Param('slugOrId') slugOrId: string,
    @CurrentUser() user: UserProfileDto | null,
  ): Promise<ContentDetailDto> {
    return this.contentsService.findBySlugOrId(slugOrId, user?.id);
  }
}
