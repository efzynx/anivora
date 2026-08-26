import { StreamFormat, VideoCodec } from './domain';

/**
 * Playback Source & Resolver DTOs
 * Based on docs/API.md & docs/PLAYER.md
 */

export interface DeviceCapabilityPayload {
  sdk: number;
  androidVersion: number;
  abi: string;
  maxResolution?: string;
}

export interface ResolvePlaybackRequestDto {
  device: DeviceCapabilityPayload;
  preferredServer?: string;
}

export interface SubtitleDto {
  id: string;
  language: string;
  languageCode: string;
  format: string;
  url: string;
  isDefault: boolean;
}

export interface PlaybackStreamSourceDto {
  id: string;
  serverLabel: string;
  streamUrl: string;
  format: StreamFormat;
  codec: VideoCodec;
  quality: string;
  headers?: Record<string, string>;
  priority?: number;
}

export interface PlaybackResolutionResultDto {
  episodeId: string;
  title: string;
  resumePositionSeconds: number;
  selectedSource: PlaybackStreamSourceDto;
  backupSources: PlaybackStreamSourceDto[];
  subtitles: SubtitleDto[];
}

export type PlaybackResolveResponseDto = PlaybackResolutionResultDto;


export interface ReportPlaybackErrorDto {
  sourceId: string;
  errorCode: string;
  errorMessage: string;
  deviceSdk?: number;
}
