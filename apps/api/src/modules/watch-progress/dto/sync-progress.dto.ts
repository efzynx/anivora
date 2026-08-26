import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class SyncProgressRequestDto {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  positionSeconds!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean = false;
}
