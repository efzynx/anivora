import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import {
  DeviceAuthSuccessDto,
  DeviceCodeResponseDto,
  UserProfileDto,
} from '@anivora/types';
import { DevicePollRequestDto } from './dto/device-auth.dto';

interface PendingDeviceSession {
  deviceCode: string;
  userCode: string;
  expiresAt: number;
  userId?: string;
  approved: boolean;
}

@Injectable()
export class AuthService {
  // In-memory / temporary store for device codes (Can be backed by Redis in production)
  private readonly sessions = new Map<string, PendingDeviceSession>();
  private readonly userCodeIndex = new Map<string, string>(); // userCode -> deviceCode

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateDeviceCode(): Promise<DeviceCodeResponseDto> {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const deviceCode = `ANV-${randomPin}`;
    const userCode = randomPin;
    const expiresIn = 600; // 10 minutes

    const session: PendingDeviceSession = {
      deviceCode,
      userCode,
      expiresAt: Date.now() + expiresIn * 1000,
      approved: false,
    };

    this.sessions.set(deviceCode, session);
    this.userCodeIndex.set(userCode, deviceCode);

    return {
      deviceCode,
      userCode,
      verificationUrl: 'https://anivora.app/activate',
      qrCodeUrl: `https://api.anivora.app/v1/auth/qr/${deviceCode}.png`,
      expiresIn,
      interval: 5,
    };
  }

  async pollDeviceCode(pollDto: DevicePollRequestDto): Promise<DeviceAuthSuccessDto> {
    const session = this.sessions.get(pollDto.deviceCode);

    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        this.sessions.delete(pollDto.deviceCode);
        this.userCodeIndex.delete(session.userCode);
      }
      throw new HttpException(
        {
          code: 'INVALID_INPUT',
          message: 'Device code expired or invalid.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!session.approved || !session.userId) {
      throw new HttpException(
        {
          code: 'AUTHORIZATION_PENDING',
          message: 'Waiting for user to approve on mobile/web.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Upsert or register TV device under the approved user
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      throw new HttpException(
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Approved user no longer exists.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Register / update device record
    await this.prisma.device.upsert({
      where: { deviceId: `${user.id}_${pollDto.deviceInfo.deviceName}_${pollDto.deviceInfo.abi}` },
      update: {
        lastSeenAt: new Date(),
        androidVersion: pollDto.deviceInfo.androidVersion,
        sdk: pollDto.deviceInfo.sdk,
      },
      create: {
        userId: user.id,
        deviceId: `${user.id}_${pollDto.deviceInfo.deviceName}_${pollDto.deviceInfo.abi}`,
        deviceName: pollDto.deviceInfo.deviceName,
        androidVersion: pollDto.deviceInfo.androidVersion,
        sdk: pollDto.deviceInfo.sdk,
        abi: pollDto.deviceInfo.abi,
      },
    });

    // Generate Tokens
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Clean up session
    this.sessions.delete(pollDto.deviceCode);
    this.userCodeIndex.delete(session.userCode);

    const userProfile: UserProfileDto = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400 * 7,
      user: userProfile,
    };
  }

  async approveDeviceCode(userCode: string, userId: string): Promise<{ success: boolean; message: string }> {
    const deviceCode = this.userCodeIndex.get(userCode);
    if (!deviceCode) {
      throw new HttpException(
        {
          code: 'INVALID_INPUT',
          message: 'Invalid or expired user activation code.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const session = this.sessions.get(deviceCode);
    if (!session || Date.now() > session.expiresAt) {
      throw new HttpException(
        {
          code: 'INVALID_INPUT',
          message: 'Activation session expired.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    session.userId = userId;
    session.approved = true;

    return {
      success: true,
      message: 'Device successfully paired and authorized.',
    };
  }
}
