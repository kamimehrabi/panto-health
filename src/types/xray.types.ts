export type XRayDataPoint = [number, [number, number, number]];

export type XRayProducerMessage = {
  [deviceId: string]: {
    time: number;
    data: XRayDataPoint[]; 
  };
};
