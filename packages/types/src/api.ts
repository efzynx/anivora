/**
 * API Standard Response Envelope & Pagination Metadata
 * Based on docs/API.md
 */

export interface ApiResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONTENT_NOT_FOUND'
  | 'EPISODE_NOT_FOUND'
  | 'SOURCE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_DEGRADED'
  | 'AUTHORIZATION_PENDING';

export interface ApiErrorDetail {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export interface AppVersionCheckRequestDto {
  version: string;
  versionCode: number;
  abi?: string;
  androidVersion?: number;
  sdk?: number;
}

export interface AppVersionCheckResponseDto {
  hasUpdate: boolean;
  isMandatory: boolean;
  latestVersion: string;
  latestVersionCode: number;
  releaseNotes?: string;
  downloadUrl: string;
  checksumSha256?: string;
  publishedAt?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

