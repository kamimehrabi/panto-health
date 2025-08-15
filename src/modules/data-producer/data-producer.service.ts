import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DataProducerService {
    private readonly logger = new Logger(DataProducerService.name);

    constructor(
        @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
    ) {}

    async connect(): Promise<void> {
        this.logger.log('Connecting RabbitMQ client...');
        try {
            await this.client.connect();
            this.logger.log('RabbitMQ client connected successfully.');
        } catch (error) {
            this.logger.error('Failed to connect to RabbitMQ broker', error);
            throw error;
        }
    }

    async publishSampleXrayData(): Promise<void> {
        const deviceId = '66bb584d4ae73e488c30a072';

        const samplePayload = {
            [deviceId]: {
                data: [
                    [762, [51.339764, 12.339223833333334, 1.2038000000000002]],
                    [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
                    [2763, [51.339782, 12.339196166666667, 2.13906]],
                ],
                time: Date.now(),
            },
        };

        this.logger.log('Publishing sample x-ray data to queue...');

        try {
            await firstValueFrom(
                this.client.emit('x-ray-data-queue', samplePayload),
            );
            this.logger.log('Message sent successfully!');
        } catch (error) {
            this.logger.error('Failed to send message:', error);
            throw new HttpException('Failed to send message to RabbitMQ', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
