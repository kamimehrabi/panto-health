// src/core/rabbitmq/rabbitmq.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RabbitMQService } from './rabbitmq.service';
import { XRayProducerMessage } from 'src/types/xray.types';
import { PayloadValidationError, TransientStoreError } from 'src/errors/rmq.errors';

@Controller()
export class RabbitMQController {
  private readonly logger = new Logger(RabbitMQController.name);

  constructor(private readonly rabbitService: RabbitMQService) {}

  @EventPattern('x-ray-data-queue')
  async onXray(@Payload() payload: XRayProducerMessage, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    this.logger.log('Received x-ray data from RabbitMQ');

    try {
      await this.rabbitService.consumeXray(payload);
      channel.ack(message); 
    } catch (err) {
      if (err instanceof PayloadValidationError) {
        this.logger.warn(`Dropping bad message: ${err.message}`);
        channel.ack(message);
        return;
      }

      if (err instanceof TransientStoreError) {
        this.logger.warn(`Transient store error (requeue): ${err.message}`);
        channel.nack(message, false, true);
        return;
      }

      this.logger.error(`Unexpected error: ${err?.stack || String(err)}`);
      channel.nack(message, false, false);
    }
  }
}
