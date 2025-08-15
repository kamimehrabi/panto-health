import { Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../signals/signals.service';
import { XRayDataPoint, XRayProducerMessage } from 'src/types/xray.types';
import { PayloadValidationError } from '../../errors/rmq.errors';

@Injectable()
export class RabbitMQService {
    private readonly logger = new Logger(RabbitMQService.name);

    constructor(private readonly signals: SignalsService) {}

    async consumeXray(payload: XRayProducerMessage): Promise<void> {
        try {
            const { deviceId, time, data } =
                this.normalizeIncomingXray(payload);

            this.logger.debug(
                `deviceId=${deviceId} time=${time} dataLen=${Array.isArray(data) ? data.length : -1}`,
            );

            await this.signals.processAndSaveXrayData(deviceId, { time, data });
        } catch (error) {
            this.logger.error(`Error in consumeXray: ${error.message}`);
            throw error;
        }
    }

    private normalizeIncomingXray(payload: XRayProducerMessage): {
        deviceId: string;
        time: number;
        data: XRayDataPoint[];
    } {
        if (!payload || typeof payload !== 'object') {
            throw new PayloadValidationError('Empty or invalid payload');
        }

        const [deviceId] = Object.keys(payload);
        if (!deviceId)
            throw new PayloadValidationError('deviceId missing from payload');

        const body = payload[deviceId] ?? {};
        const time = Number(body.time ?? Date.now());

        let data = body.data as unknown;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                throw new PayloadValidationError(
                    'data is a string but not valid JSON',
                );
            }
        }

        if (!Array.isArray(data)) {
            throw new PayloadValidationError('data is not an array');
        }

        return { deviceId, time, data: data as XRayDataPoint[] };
    }
}
