import { Controller, Get, Query } from '@nestjs/common';
import { AppUpdateService } from './app-update.service';
import { AppVersionCheckDto } from './dto/app-version-check.dto';

@Controller('app')
export class AppUpdateController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Get('check-update')
  checkUpdate(@Query() query: AppVersionCheckDto) {
    return this.appUpdateService.checkUpdate(query);
  }
}
