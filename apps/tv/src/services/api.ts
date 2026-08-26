import axios, { AxiosInstance } from 'axios';
import {
  ApiSuccessResponse,
  HomeFeedDto,
  ContentDetailDto,
  ApiResponseMeta,
  EpisodeDto,
  SearchQueryDto,
  ContentSummaryDto,
  PlaybackResolutionResultDto,
  DeviceAuthSuccessDto,
  DeviceCodeResponseDto,
  AppVersionCheckRequestDto,
  AppVersionCheckResponseDto,
  WatchHistoryItemDto,
} from '@anivora/types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://10.0.2.2:3000/api/v1';

export interface PaginatedResult<T> {
  data: T[];
  meta: ApiResponseMeta;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.token && config.headers) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  async getHomeFeed(): Promise<HomeFeedDto> {
    const res = await this.client.get<ApiSuccessResponse<HomeFeedDto>>('/home');
    return res.data.data;
  }

  async getContentDetail(slugOrId: string): Promise<ContentDetailDto> {
    const res = await this.client.get<ApiSuccessResponse<ContentDetailDto>>(`/contents/${slugOrId}`);
    return res.data.data;
  }

  async getEpisodes(slugOrId: string, page = 1, limit = 50): Promise<PaginatedResult<EpisodeDto>> {
    const res = await this.client.get<ApiSuccessResponse<EpisodeDto[]>>(`/contents/${slugOrId}/episodes`, {
      params: { page, limit },
    });
    return {
      data: res.data.data,
      meta: res.data.meta!,
    };
  }

  async search(query: string, type: 'ALL' | 'ANIME' | 'DONGHUA' = 'ALL', limit = 20): Promise<ContentSummaryDto[]> {
    const res = await this.client.get<ApiSuccessResponse<ContentSummaryDto[]>>('/search', {
      params: { q: query, type, limit } as SearchQueryDto,
    });
    return res.data.data;
  }

  async resolvePlayback(episodeId: string, preferredServer?: string): Promise<PlaybackResolutionResultDto> {
    const res = await this.client.post<ApiSuccessResponse<PlaybackResolutionResultDto>>(
      `/episodes/${episodeId}/play`,
      {
        preferredServer,
        device: {
          sdk: 23,
          androidVersion: 6,
          abi: 'armeabi-v7a',
          maxResolution: '720p',
        },
      },
    );
    return res.data.data;
  }

  async syncProgress(episodeId: string, positionSeconds: number, durationSeconds: number, completed = false) {
    await this.client.post(`/episodes/${episodeId}/progress`, {
      positionSeconds,
      durationSeconds,
      completed,
    });
  }

  async requestDeviceCode(): Promise<DeviceCodeResponseDto> {
    const res = await this.client.post<ApiSuccessResponse<DeviceCodeResponseDto>>('/auth/device/code');
    return res.data.data;
  }

  async pollDeviceStatus(deviceCode: string): Promise<DeviceAuthSuccessDto> {
    const res = await this.client.post<ApiSuccessResponse<DeviceAuthSuccessDto>>('/auth/device/poll', {
      deviceCode,
      deviceInfo: {
        deviceName: 'Android TV Device',
        androidVersion: 6,
        sdk: 23,
        abi: 'armeabi-v7a',
      },
    });
    return res.data.data;
  }

  async getFavorites(): Promise<ContentSummaryDto[]> {
    const res = await this.client.get<ApiSuccessResponse<ContentSummaryDto[]>>('/favorites');
    return res.data.data;
  }

  async addFavorite(contentId: string): Promise<{ success: boolean; message: string }> {
    const res = await this.client.post<ApiSuccessResponse<{ success: boolean; message: string }>>(`/favorites/${contentId}`);
    return res.data.data;
  }

  async removeFavorite(contentId: string): Promise<{ success: boolean; message: string }> {
    const res = await this.client.delete<ApiSuccessResponse<{ success: boolean; message: string }>>(`/favorites/${contentId}`);
    return res.data.data;
  }

  async getWatchHistory(): Promise<WatchHistoryItemDto[]> {
    const res = await this.client.get<ApiSuccessResponse<WatchHistoryItemDto[]>>('/history');
    return res.data.data;
  }

  async checkAppUpdate(payload: AppVersionCheckRequestDto): Promise<AppVersionCheckResponseDto> {
    const res = await this.client.get<ApiSuccessResponse<AppVersionCheckResponseDto>>('/app/check-update', {
      params: payload,
    });
    return res.data.data;
  }
}

export const api = new ApiClient();
