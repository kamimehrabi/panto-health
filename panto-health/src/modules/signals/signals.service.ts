// src/signals/signal.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Signal, SignalDocument, XRayDataPoint } from './schemas/signals.schema';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    @InjectModel(Signal.name) private readonly signalModel: Model<SignalDocument>,
  ) {}

  async processAndSaveXrayData(deviceId: string, dataPayload: { data: XRayDataPoint[]; time: number; }): Promise<SignalDocument> {
    this.logger.log(`Processing raw x-ray data for device: ${deviceId}...`);

    const { time, data } = dataPayload;

    const dataLength = data.length;

    // Assuming dataVolume is a simple sum of the first element in each inner array.
    const dataVolume = data.reduce((sum: number, [value]: XRayDataPoint) => sum + value, 0);
    
    const newSignal = new this.signalModel({
      deviceId,
      time,
      dataLength,
      dataVolume,
      data,
    });

    try {
      const savedSignal = await newSignal.save();
      this.logger.log(`Signal saved successfully with id: ${savedSignal._id}`);
      return savedSignal;
    } catch (error) {
      this.logger.error('Failed to save signal to MongoDB', error.stack);
      throw error;
    }
  }
}
