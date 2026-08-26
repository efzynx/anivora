import axios from 'axios';
import {
  ApiSuccessResponse,
  HomeFeedDto,
  ContentDetailDto,
  EpisodeDto,
  ContentSummaryDto,
  PlaybackResolutionResultDto,
} from '@anivora/types';

const API_BASE = 'http://localhost:3000/api/v1';

export const previewApi = {
  async getHome(): Promise<HomeFeedDto> {
    const res = await axios.get<ApiSuccessResponse<HomeFeedDto>>(`${API_BASE}/home`);
    return res.data.data;
  },
  async getDetail(slugOrId: string): Promise<ContentDetailDto> {
    const res = await axios.get<ApiSuccessResponse<ContentDetailDto>>(`${API_BASE}/contents/${slugOrId}`);
    return res.data.data;
  },
  async getEpisodes(slugOrId: string): Promise<EpisodeDto[]> {
    const res = await axios.get<ApiSuccessResponse<EpisodeDto[]>>(`${API_BASE}/contents/${slugOrId}/episodes?limit=100`);
    return res.data.data;
  },
  async search(query: string): Promise<ContentSummaryDto[]> {
    const res = await axios.get<ApiSuccessResponse<ContentSummaryDto[]>>(`${API_BASE}/search`, {
      params: { q: query, limit: 20 },
    });
    return res.data.data;
  },
  async resolvePlayback(episodeId: string): Promise<PlaybackResolutionResultDto> {
    const res = await axios.post<ApiSuccessResponse<PlaybackResolutionResultDto>>(`${API_BASE}/episodes/${episodeId}/play`, {
      device: { sdk: 23, androidVersion: 6, abi: 'armeabi-v7a' },
    });
    return res.data.data;
  },
};
