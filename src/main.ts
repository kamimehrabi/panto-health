import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
    );

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [configService.get<string>('RABBITMQ_URI')!],
            queue: configService.get<string>('RABBITMQ_QUEUE')!,
            noAck: false,
            queueOptions: {
                durable: false,
            },
        },
    });

    await app.listen(configService.get<number>('PORT') || 3000);

    await app.startAllMicroservices();

    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
