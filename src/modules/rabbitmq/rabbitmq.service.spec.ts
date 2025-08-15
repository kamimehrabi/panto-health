import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { RabbitMQService } from './rabbitmq.service';
import { SignalsService } from '../signals/signals.service';

import { PayloadValidationError } from '../../errors/rmq.errors';
import type { XRayProducerMessage, XRayDataPoint } from 'src/types/xray.types';

beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
});

describe('RabbitMQService', () => {
    let service: RabbitMQService;
    let signals: { processAndSaveXrayData: jest.Mock };

    beforeAll(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    });

    beforeEach(async () => {
        signals = {
            processAndSaveXrayData: jest.fn().mockResolvedValue(undefined),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                RabbitMQService,
                { provide: SignalsService, useValue: signals },
            ],
        }).compile();

        service = moduleRef.get(RabbitMQService);
    });

    describe('consumeXray', () => {
        it('normalizes and forwards to SignalsService', async () => {
            const data = [] as XRayDataPoint[];
            const payload: XRayProducerMessage = {
                'dev-1': { time: 123, data },
            } as any;

            await service.consumeXray(payload);

            expect(signals.processAndSaveXrayData).toHaveBeenCalledWith(
                'dev-1',
                {
                    time: 123,
                    data,
                },
            );
        });

        it('parses stringified data and forwards', async () => {
            const data = [] as XRayDataPoint[];
            const payload: XRayProducerMessage = {
                abc: { time: 9, data: JSON.stringify(data) },
            } as any;

            await service.consumeXray(payload);

            expect(signals.processAndSaveXrayData).toHaveBeenCalledWith('abc', {
                time: 9,
                data,
            });
        });

        it('rethrows underlying SignalsService errors', async () => {
            signals.processAndSaveXrayData.mockRejectedValueOnce(
                new Error('db fail'),
            );
            const payload: XRayProducerMessage = {
                dev: { time: 1, data: [] as XRayDataPoint[] },
            } as any;

            await expect(service.consumeXray(payload)).rejects.toThrow(
                'db fail',
            );
        });
    });

    describe('normalizeIncomingXray (private)', () => {
        const call = (p: any) => (service as any).normalizeIncomingXray(p);

        it('throws on empty or non-object payload', () => {
            expect(() => call(null)).toThrow(PayloadValidationError);
            expect(() => call(undefined)).toThrow(PayloadValidationError);
            expect(() => call('nope')).toThrow(PayloadValidationError);
        });

        it('throws when deviceId is missing', () => {
            expect(() => call({})).toThrow(PayloadValidationError);
        });

        it('uses Date.now when time missing', () => {
            const now = 1_777_777_777;
            const originalNow = Date.now;
            // @ts-ignore
            Date.now = jest.fn(() => now);

            try {
                const data = [] as XRayDataPoint[];
                const res = call({ deviceA: { data } });
                expect(res).toEqual({ deviceId: 'deviceA', time: now, data });
            } finally {
                Date.now = originalNow;
            }
        });

        it('throws when data string is not valid JSON', () => {
            expect(() => call({ dev: { time: 1, data: 'not-json' } })).toThrow(
                PayloadValidationError,
            );
        });

        it('throws when data is not an array', () => {
            expect(() =>
                call({ dev: { time: 1, data: { foo: 'bar' } } }),
            ).toThrow(PayloadValidationError);
        });
    });
});
