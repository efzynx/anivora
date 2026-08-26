/**
 * Authentication & TV Device Pairing Flow
 * Based on docs/API.md & docs/ANDROID-TV.md
 */

export interface DeviceCodeResponseDto {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  qrCodeUrl: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceInfoPayload {
  deviceName: string;
  androidVersion: number;
  sdk: number;
  abi: string;
}

export interface DevicePollRequestDto {
  deviceCode: string;
  deviceInfo: DeviceInfoPayload;
}

export interface UserProfileDto {
  id: string;
  username: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface WatchHistoryItemDto {
  id: string;
  contentId: string;
  contentTitle: string;
  contentSlug: string;
  posterUrl?: string | null;
  episodeId: string;
  episodeNumber: number;
  episodeTitle?: string | null;
  watchedAt: string | Date;
}

export interface DeviceAuthSuccessDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfileDto;
}

export interface SyncProgressDto {
  positionSeconds: number;
  durationSeconds: number;
  completed?: boolean;
}
