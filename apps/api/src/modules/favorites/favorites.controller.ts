import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ContentSummaryDto } from '@anivora/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @CurrentUser('id') userId: string,
  ): Promise<ContentSummaryDto[]> {
    return this.favoritesService.getFavorites(userId);
  }

  @Post(':contentId')
  async addFavorite(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.addFavorite(userId, contentId);
  }

  @Delete(':contentId')
  async removeFavorite(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.removeFavorite(userId, contentId);
  }
}
