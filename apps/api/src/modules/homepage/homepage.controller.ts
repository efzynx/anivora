import { Controller, Get, UseGuards } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { HomeFeedDto, UserProfileDto } from '@anivora/types';
import { OptionalJwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('home')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getHomeFeed(@CurrentUser() user: UserProfileDto | null): Promise<HomeFeedDto> {
    return this.homepageService.getHomeFeed(user?.id);
  }
}
