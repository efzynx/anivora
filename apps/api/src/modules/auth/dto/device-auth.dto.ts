import { IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceInfoPayload } from '@anivora/types';

export class DeviceInfoPayloadDto implements DeviceInfoPayload {
  @IsNotEmpty()
  @IsString()
  deviceName!: string;

  @IsNotEmpty()
  @IsNumber()
  androidVersion!: number;

  @IsNotEmpty()
  @IsNumber()
  sdk!: number;

  @IsNotEmpty()
  @IsString()
  abi!: string;
}

export class DevicePollRequestDto {
  @IsNotEmpty()
  @IsString()
  deviceCode!: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoPayloadDto)
  deviceInfo!: DeviceInfoPayloadDto;
}

export class DeviceApproveDto {
  @IsNotEmpty()
  @IsString()
  userCode!: string;
}
