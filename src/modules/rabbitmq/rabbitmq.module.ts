import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQController } from './rabbitmq.controller';
import { SignalsModule } from '../signals/signals.module';

@Module({
    imports: [
        ConfigModule,
        SignalsModule,
        ClientsModule.registerAsync([
            {
                name: 'RABBITMQ_SERVICE',
                imports: [ConfigModule],
                useFactory: async (cfg: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [cfg.get<string>('RABBITMQ_URI')!],
                        queue: cfg.get<string>('RABBITMQ_QUEUE')!,
                        queueOptions: { durable: false },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [RabbitMQController],
    providers: [RabbitMQService],
    exports: [RabbitMQService],
})
export class RabbitMQModule {}
