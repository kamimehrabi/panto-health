import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { DataProducerService } from './modules/data-producer/data-producer.service';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AppService.name);
    private intervalId: NodeJS.Timeout;

    constructor(private readonly dataProducerService: DataProducerService) {}

    async onModuleInit() {
        this.logger.log(
            'AppService initialized. Waiting to connect and start data producer...',
        );
        
        try {
            await this.dataProducerService.connect();
        } catch (error) {
            this.logger.error(
                'Failed to connect to RabbitMQ, producer will not start.',
                error,
            );
            return;
        }

        this.logger.log('Starting data producer...');
        this.intervalId = setInterval(async () => {
            this.logger.log('Publishing new sample data...');
            await this.dataProducerService.publishSampleXrayData();
        }, 30 * 1000); // Publish every 30 seconds
    }

    onModuleDestroy() {
        this.logger.log('AppService shutting down. Clearing producer timer...');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
