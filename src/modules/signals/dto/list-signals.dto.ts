import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSignalsQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number = 20;

  @IsOptional() @IsIn(['newest', 'oldest'])
  sort?: 'newest' | 'oldest' = 'newest';

  @IsOptional() @IsString()
  deviceId?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  from?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  to?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  minDataLength?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  maxDataLength?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  minVolume?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  maxVolume?: number;
}
