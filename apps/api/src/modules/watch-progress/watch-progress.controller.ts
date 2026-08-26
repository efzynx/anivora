import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { WatchProgressService } from './watch-progress.service';
import { SyncProgressRequestDto } from './dto/sync-progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WatchHistoryItemDto } from '@anivora/types';

@Controller()
@UseGuards(JwtAuthGuard)
export class WatchProgressController {
  constructor(private readonly watchProgressService: WatchProgressService) {}

  @Post('episodes/:id/progress')
  async syncProgress(
    @Param('id') episodeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SyncProgressRequestDto,
  ) {
    return this.watchProgressService.syncProgress(episodeId, userId, dto);
  }

  @Get('history')
  async getWatchHistory(@CurrentUser('id') userId: string): Promise<WatchHistoryItemDto[]> {
    return this.watchProgressService.getHistory(userId);
  }
}
