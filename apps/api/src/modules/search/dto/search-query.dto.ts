import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '@anivora/types';

export class SearchQueryDto {
  @IsNotEmpty()
  @IsString()
  q!: string;

  @IsOptional()
  @IsEnum(['ALL', 'ANIME', 'DONGHUA'])
  type?: 'ALL' | ContentType = 'ALL';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
