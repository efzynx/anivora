import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceCapabilityPayload } from '@anivora/types';

export class DeviceCapabilityDto implements DeviceCapabilityPayload {
  @IsNumber()
  sdk!: number;

  @IsNumber()
  androidVersion!: number;

  @IsString()
  abi!: string;

  @IsOptional()
  @IsString()
  maxResolution?: string;
}

export class ResolvePlaybackRequestDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceCapabilityDto)
  device?: DeviceCapabilityDto;

  @IsOptional()
  @IsString()
  preferredServer?: string;
}

export class ReportPlaybackErrorDto {
  @IsNotEmpty()
  @IsString()
  sourceId!: string;

  @IsNotEmpty()
  @IsString()
  errorCode!: string;

  @IsNotEmpty()
  @IsString()
  errorMessage!: string;

  @IsOptional()
  @IsNumber()
  deviceSdk?: number;
}
