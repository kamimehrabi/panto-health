// src/app.service.spec.ts
import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { DataProducerService } from './modules/data-producer/data-producer.service';
import { Logger } from '@nestjs/common';



describe('AppService', () => {
  let service: AppService;
  let dataProducer: { connect: jest.Mock; publishSampleXrayData: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();

    dataProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      publishSampleXrayData: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: DataProducerService, useValue: dataProducer },
      ],
    }).compile();

    service = moduleRef.get(AppService);

    const logger = (service as any).logger as Logger;
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

    const tick = async (ms: number) => {
        // @ts-ignore
        if (jest.advanceTimersByTimeAsync) {
            // @ts-ignore
            await jest.advanceTimersByTimeAsync(ms);
        } else {
            jest.advanceTimersByTime(ms);
            await Promise.resolve();
        }
    };

    it('connects and schedules a 30s interval that publishes sample data', async () => {
        await service.onModuleInit();

        expect(dataProducer.connect).toHaveBeenCalledTimes(1);
        expect(dataProducer.publishSampleXrayData).not.toHaveBeenCalled();

        await tick(30_000);
        expect(dataProducer.publishSampleXrayData).toHaveBeenCalledTimes(1);

        await tick(60_000);
        expect(dataProducer.publishSampleXrayData).toHaveBeenCalledTimes(3);
    });

    it('does not start interval when connect fails', async () => {
        dataProducer.connect.mockRejectedValueOnce(new Error('amqp down'));
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        await service.onModuleInit();

        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(dataProducer.publishSampleXrayData).not.toHaveBeenCalled();

        setIntervalSpy.mockRestore();
    });

    it('clears interval on module destroy (no further publishes)', async () => {
        await service.onModuleInit();

        await tick(30_000);
        expect(dataProducer.publishSampleXrayData).toHaveBeenCalledTimes(1);

        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        service.onModuleDestroy();
        expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

        await tick(60_000);
        expect(dataProducer.publishSampleXrayData).toHaveBeenCalledTimes(1);

        clearIntervalSpy.mockRestore();
    });
});
