import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AppVersionCheckRequestDto } from '@anivora/types';

export class AppVersionCheckDto implements AppVersionCheckRequestDto {
  @IsNotEmpty()
  @IsString()
  version!: string;

  @IsNotEmpty()
  @IsNumber()
  versionCode!: number;

  @IsOptional()
  @IsString()
  abi?: string;

  @IsOptional()
  @IsNumber()
  androidVersion?: number;

  @IsOptional()
  @IsNumber()
  sdk?: number;
}
