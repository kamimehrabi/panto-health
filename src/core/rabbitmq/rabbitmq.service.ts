// rabbitmq.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
    // A logger instance for better console output.
    private readonly logger = new Logger(RabbitMQService.name);

    // This decorator tells NestJS to listen for messages on the 'x-ray-data-queue'.
    // This method is the consumer for the x-ray data, which directly addresses Part 2.
    // The queue itself is automatically asserted (created) by the NestJS client on startup,
    // which addresses Part 1.
    @EventPattern('x-ray-data-queue')
    async handleXrayData(@Payload() data: any, @Ctx() context: RmqContext) {
        this.logger.log(
            `Received x-ray data from RabbitMQ: ${JSON.stringify(data)}`,
        );

        // Your assignment mentions data like:
        // {
        //   "data": [
        //      [2763, [51.339782, 12.339196166666667, 2.13906]],
        //      ...
        //   ],
        //   "time": 1735683480000 //timestamp
        // }
        // The 'data' parameter in this method will contain this exact object.

        // TODO: In the next part of your assignment, you will add the logic
        // to process and store this data here.

        // This is a crucial step for a message consumer.
        // It manually acknowledges the message, telling RabbitMQ that it has been
        // successfully processed and can be removed from the queue.
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
    }
}
