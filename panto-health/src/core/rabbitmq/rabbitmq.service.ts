import { Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { SignalsService } from 'src/modules/signals/signals.service';

@Injectable()
export class RabbitMQService {
    private readonly logger = new Logger(RabbitMQService.name);

    constructor(private readonly signalService: SignalsService) {}

    @EventPattern('x-ray-data-queue')
    async handleXrayData(
        @Payload() rawPayload: any,
        @Ctx() context: RmqContext,
    ) {
        this.logger.log(`Received x-ray data from RabbitMQ.`);

        try {
            const deviceId = Object.keys(rawPayload)[0];
            const dataPayload = rawPayload[deviceId];

            if (deviceId && dataPayload) {
                await this.signalService.processAndSaveXrayData(
                    deviceId,
                    dataPayload,
                );
            } else {
                this.logger.warn(
                    'Received malformed data payload, skipping message.',
                );
            }
        } catch (error) {
            this.logger.error(
                'Failed to process and save x-ray data',
                error.stack,
            );
        }

        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
    }
}
