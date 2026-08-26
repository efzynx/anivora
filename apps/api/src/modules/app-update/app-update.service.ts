import { Injectable } from '@nestjs/common';
import { AppVersionCheckRequestDto, AppVersionCheckResponseDto } from '@anivora/types';

@Injectable()
export class AppUpdateService {
  // Can be overridden via environment variables or DB in production
  private readonly latestVersion = process.env.APP_LATEST_VERSION || '1.0.0';
  private readonly latestVersionCode = parseInt(process.env.APP_LATEST_VERSION_CODE || '1', 10);
  private readonly minSupportedVersionCode = parseInt(process.env.APP_MIN_SUPPORTED_VERSION_CODE || '1', 10);
  private readonly apkDownloadBaseUrl =
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/efzyn/anivora/releases/latest/download/anivora-tv-release.apk';

  checkUpdate(query: AppVersionCheckRequestDto): AppVersionCheckResponseDto {
    const clientVersionCode = Number(query.versionCode) || 1;
    const hasUpdate = clientVersionCode < this.latestVersionCode;
    const isMandatory = clientVersionCode < this.minSupportedVersionCode;

    return {
      hasUpdate,
      isMandatory,
      latestVersion: this.latestVersion,
      latestVersionCode: this.latestVersionCode,
      releaseNotes: hasUpdate
        ? `ANIVORA TV v${this.latestVersion} update tersedia. Peningkatan stabilitas pemutaran video ExoPlayer & D-Pad focus engine.`
        : undefined,
      downloadUrl: this.apkDownloadBaseUrl,
      checksumSha256: process.env.APP_APK_SHA256,
      publishedAt: new Date().toISOString(),
    };
  }
}
