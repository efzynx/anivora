import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { ReportPlaybackErrorDto, ResolvePlaybackRequestDto } from './dto/playback.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlaybackResolutionResultDto } from '@anivora/types';
import { AuthGuard } from '@nestjs/passport';

class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}

@Controller('episodes')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Post(':id/play')
  @UseGuards(OptionalJwtAuthGuard)
  async resolvePlayback(
    @Param('id') episodeId: string,
    @Body() dto: ResolvePlaybackRequestDto,
    @CurrentUser('id') userId?: string,
  ): Promise<PlaybackResolutionResultDto> {
    return this.playbackService.resolvePlayback(episodeId, dto, userId);
  }

  @Post(':id/report-error')
  async reportPlaybackError(
    @Param('id') episodeId: string,
    @Body() dto: ReportPlaybackErrorDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.playbackService.reportError(episodeId, dto);
  }
}
