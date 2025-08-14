// src/rabbitmq/rabbitmq.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQService } from './rabbitmq.service';
import { SignalsModule } from '../../modules/signals/signals.module';

@Module({
  imports: [
    // We import the ClientsModule to configure our RabbitMQ client.
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            // We'll use a single url here, which should be retrieved from our .env file.
            // For now, we will use the same URL used in our main.ts.
            // In a real-world scenario, we would use ConfigModule to get this value.
            'amqp://app:supersecret@rabbitmq:5672',
          ],
          queue: 'x-ray-data-queue',
        },
      },
    ]),
    // We import the SignalsModule to make the SignalService available.
    SignalsModule,
  ],
  controllers: [],
  // The RabbitMQService is a provider and consumer in this module.
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
