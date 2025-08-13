import { Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
    private readonly logger = new Logger(RabbitMQService.name);

    @EventPattern('x-ray-data-queue')
    async handleXrayData(@Payload() data: any, @Ctx() context: RmqContext) {
        this.logger.log(
            `Received x-ray data from RabbitMQ: ${JSON.stringify(data)}`,
        );


        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
    }
}
