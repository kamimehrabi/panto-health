import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { SignalsModule } from './modules/signals/signals.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppService } from './app.service';
import { DataProducerModule } from './modules/data-producer/data-producer.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI'),
            }),
            inject: [ConfigService],
        }),
        ClientsModule.registerAsync([
            {
                name: 'RABBITMQ_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [configService.get<string>('RABBITMQ_URI')!],
                        queue: configService.get<string>('RABBITMQ_QUEUE')!,
                        queueOptions: {
                            durable: false,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),

        RabbitMQModule,
        SignalsModule,
        DataProducerModule,
    ],
    controllers: [],
    providers: [AppService],
})
export class AppModule {}
