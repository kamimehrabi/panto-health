import { IsArray, IsNumber, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { XRayTuple } from './create-signal.dto';

export class UpdateSignalDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  time?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  data?: XRayTuple[];
}
