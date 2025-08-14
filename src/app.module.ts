import { Module } from '@nestjs/common';
import { RabbitMQModule } from './core/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitMQModule],
})
export class AppModule {}