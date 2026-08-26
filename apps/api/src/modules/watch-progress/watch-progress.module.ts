import { Module } from '@nestjs/common';
import { WatchProgressService } from './watch-progress.service';
import { WatchProgressController } from './watch-progress.controller';

@Module({
  controllers: [WatchProgressController],
  providers: [WatchProgressService],
  exports: [WatchProgressService],
})
export class WatchProgressModule {}
