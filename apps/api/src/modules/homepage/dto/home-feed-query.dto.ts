import { IsOptional, IsString } from 'class-validator';

export class HomeFeedQueryDto {
  @IsOptional()
  @IsString()
  device_type?: string;
}
