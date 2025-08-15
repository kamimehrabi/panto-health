import { IsArray, IsNumber, IsString, ArrayMinSize } from 'class-validator';

export type XRayTuple = [number, [number, number, number]];

export class CreateSignalDto {
  @IsString()
  deviceId: string;

  @IsNumber()
  time: number;

  @IsArray()
  @ArrayMinSize(1)
  data: XRayTuple[];
}   
