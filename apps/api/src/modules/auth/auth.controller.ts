import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DeviceApproveDto, DevicePollRequestDto } from './dto/device-auth.dto';
import { DeviceAuthSuccessDto, DeviceCodeResponseDto } from '@anivora/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('device/code')
  async requestDeviceCode(): Promise<DeviceCodeResponseDto> {
    return this.authService.generateDeviceCode();
  }

  @Post('device/poll')
  async pollDeviceCode(
    @Body() pollDto: DevicePollRequestDto,
  ): Promise<DeviceAuthSuccessDto> {
    return this.authService.pollDeviceCode(pollDto);
  }

  @Post('device/approve')
  @UseGuards(JwtAuthGuard)
  async approveDevice(
    @Body() approveDto: DeviceApproveDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.approveDeviceCode(approveDto.userCode, userId);
  }
}
