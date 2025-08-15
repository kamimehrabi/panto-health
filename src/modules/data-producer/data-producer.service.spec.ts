import { Test } from '@nestjs/testing';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { DataProducerService } from './data-producer.service';

describe('DataProducerService', () => {
  let service: DataProducerService;
  let client: { connect: jest.Mock; emit: jest.Mock };

  beforeEach(async () => {
    client = { connect: jest.fn().mockResolvedValue(undefined), emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DataProducerService,
        { provide: 'RABBITMQ_SERVICE', useValue: client },
      ],
    }).compile();

    service = moduleRef.get(DataProducerService);

    const logger = (service as any).logger as Logger;
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  describe('connect', () => {
    it('connects the ClientProxy successfully', async () => {
      await service.connect();
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('rethrows when ClientProxy.connect fails', async () => {
      client.connect.mockRejectedValueOnce(new Error('amqp down'));
      await expect(service.connect()).rejects.toThrow('amqp down');
    });
  });

  describe('publishSampleXrayData', () => {
    const FIXED_NOW = 1_777_777_777_000;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    });

    it('emits the expected payload on the expected topic', async () => {
      client.emit.mockReturnValue(of(undefined));

      await service.publishSampleXrayData();

      expect(client.emit).toHaveBeenCalledTimes(1);
      const [topic, payload] = client.emit.mock.calls[0];

      expect(topic).toBe('x-ray-data-queue');

      const deviceId = '66bb584d4ae73e488c30a072';
      expect(payload).toStrictEqual({
        [deviceId]: {
          data: [
            [762, [51.339764, 12.339223833333334, 1.2038000000000002]],
            [1766, [51.33977733333333, 12.339211833333334, 1.531604]],
            [2763, [51.339782, 12.339196166666667, 2.13906]],
          ],
          time: FIXED_NOW,
        },
      });
    });

    it('throws HttpException(503) when emit observable errors', async () => {
      client.emit.mockReturnValue(throwError(() => new Error('emit failed')));

      await expect(service.publishSampleXrayData()).rejects.toBeInstanceOf(
        HttpException,
      );

      try {
        await service.publishSampleXrayData();
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(String(e.message)).toContain('Failed to send message to RabbitMQ');
      }
    });
  });
});
