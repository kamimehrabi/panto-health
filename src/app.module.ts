import { Module } from '@nestjs/common';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitMQModule],
})
export class AppModule {}