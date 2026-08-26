import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { GenresModule } from './modules/genres/genres.module';
import { ContentsModule } from './modules/contents/contents.module';
import { EpisodesModule } from './modules/episodes/episodes.module';
import { SearchModule } from './modules/search/search.module';
import { HomepageModule } from './modules/homepage/homepage.module';
import { AuthModule } from './modules/auth/auth.module';
import { WatchProgressModule } from './modules/watch-progress/watch-progress.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PlaybackModule } from './modules/playback/playback.module';
import { AppUpdateModule } from './modules/app-update/app-update.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    AppUpdateModule,
    GenresModule,
    ContentsModule,
    EpisodesModule,
    PlaybackModule,
    SearchModule,
    HomepageModule,
    WatchProgressModule,
    FavoritesModule,
  ],
})
export class AppModule {}
