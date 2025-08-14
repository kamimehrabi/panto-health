import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from './core/rabbitmq/rabbitmq.module';
import { SignalsModule } from './modules/signals/signals.module';

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

        RabbitMQModule,
        SignalsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
