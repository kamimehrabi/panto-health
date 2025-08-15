import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SignalsService } from './signals.service';

import type { XRayDataPoint } from 'src/types/xray.types';
import type { XRayTuple } from './dto/create-signal.dto';

const SIGNAL_TOKEN = getModelToken('Signal');

beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});

describe('SignalsService', () => {
    let service: SignalsService;

    let ModelCtor: any;

    let saveMock: jest.Mock;

    let findExec: jest.Mock;
    let findChain: any;

    let findByIdExec: jest.Mock;
    let findByIdChain: any;

    let findByIdAndDeleteExec: jest.Mock;
    let findByIdAndDeleteChain: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        const chain = (withLean = true, execMock = jest.fn()) => {
            const base: any = { exec: execMock };
            if (withLean) base.lean = jest.fn().mockReturnThis();
            return base;
        };

        findExec = jest.fn();
        findChain = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: findExec,
        };

        findByIdExec = jest.fn();
        findByIdChain = chain(true, findByIdExec); 

        findByIdAndDeleteExec = jest.fn();
        findByIdAndDeleteChain = chain(true, findByIdAndDeleteExec);

        saveMock = jest.fn();
        ModelCtor = jest.fn().mockImplementation((doc: any) => ({
            ...doc,
            save: saveMock,
        }));

        ModelCtor.find = jest.fn().mockReturnValue(findChain);
        ModelCtor.countDocuments = jest
            .fn()
            .mockReturnValue({ exec: jest.fn() });
        ModelCtor.findById = jest.fn().mockReturnValue(findByIdChain);
        ModelCtor.findByIdAndDelete = jest
            .fn()
            .mockReturnValue(findByIdAndDeleteChain);

        const moduleRef = await Test.createTestingModule({
            providers: [
                SignalsService,
                {
                    provide: SIGNAL_TOKEN,
                    useValue: ModelCtor,
                },
            ],
        }).compile();

        service = moduleRef.get(SignalsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('processAndSaveXrayData', () => {
        it('saves and returns the document', async () => {
            const data: XRayDataPoint[] = [
                [1, [1000, 1000, 1000]],
                [2, [1001, 1001, 1001]],
            ];
            const saved = {
                _id: 'abc123',
                deviceId: 'dev-1',
                time: 111,
                dataLength: 2,
                dataVolume: 3,
                data,
            };
            saveMock.mockResolvedValue(saved);

            const result = await service.processAndSaveXrayData('dev-1', {
                time: 111,
                data,
            });

            expect(ModelCtor).toHaveBeenCalledWith({
                deviceId: 'dev-1',
                time: 111,
                dataLength: 2,
                dataVolume: 3, 
                data,
            });
            expect(saveMock).toHaveBeenCalledTimes(1);
            expect(result).toBe(saved);
        });

        it('rethrows underlying save error (service does not wrap here)', async () => {
            saveMock.mockRejectedValue(new Error('db-save-failed'));

            await expect(
                service.processAndSaveXrayData('dev-1', {
                    time: 111,
                    data: [] as any,
                }),
            ).rejects.toThrow('db-save-failed');
        });
    });

    describe('createViaHttp', () => {
        it('delegates to processAndSaveXrayData and returns saved doc', async () => {
            const saved = { _id: 'id-1' };
            saveMock.mockResolvedValue(saved);

            const res = await service.createViaHttp({
                deviceId: 'd',
                time: 1,
                data: [] as XRayTuple[],
            } as any);

            expect(res).toBe(saved);
        });

        it('wraps errors as InternalServerErrorException', async () => {
            saveMock.mockRejectedValue(new Error('db down'));

            await expect(
                service.createViaHttp({
                    deviceId: 'dev-9',
                    time: 100,
                    data: [] as XRayTuple[],
                } as any),
            ).rejects.toBeInstanceOf(InternalServerErrorException);
        });
    });

    describe('findAllPaged', () => {
        it('returns paginated list', async () => {
            const items = [{ _id: '1' }, { _id: '2' }];
            const total = 42;

            findExec.mockResolvedValueOnce(items);
            (
                ModelCtor.countDocuments().exec as jest.Mock
            ).mockResolvedValueOnce(total);

            const result = await service.findAllPaged(2, 10, 'newest', {
                deviceId: 'dev-42',
                from: 100,
                to: 200,
                minDataLength: 10,
                maxDataLength: 20,
                minVolume: 5,
                maxVolume: 50,
            });

            expect(ModelCtor.find).toHaveBeenCalledWith({
                deviceId: 'dev-42',
                time: { $gte: 100, $lte: 200 },
                dataLength: { $gte: 10, $lte: 20 },
                dataVolume: { $gte: 5, $lte: 50 },
            });
            expect(findChain.sort).toHaveBeenCalledWith({ createdAt: 'desc' });
            expect(findChain.skip).toHaveBeenCalledWith(10);
            expect(findChain.limit).toHaveBeenCalledWith(10);

            expect(result).toEqual({ items, total, page: 2, limit: 10 });
        });

        it('wraps db errors as InternalServerErrorException', async () => {
            findExec.mockRejectedValueOnce(new Error('DB error'));

            await expect(service.findAllPaged()).rejects.toBeInstanceOf(
                InternalServerErrorException,
            );
        });
    });

    describe('findOne', () => {
        it('returns a signal when found', async () => {
            const doc = { _id: 'x' };
            findByIdExec.mockResolvedValueOnce(doc);

            const res = await service.findOne('x');

            expect(ModelCtor.findById).toHaveBeenCalledWith('x');
            expect(res).toBe(doc);
        });

        it('throws NotFoundException when not found', async () => {
            findByIdExec.mockResolvedValueOnce(null);

            await expect(service.findOne('missing')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('wraps unexpected errors as InternalServerErrorException', async () => {
            findByIdExec.mockRejectedValueOnce(new Error('db boom'));

            await expect(service.findOne('x')).rejects.toBeInstanceOf(
                InternalServerErrorException,
            );
        });
    });

    describe('update', () => {
        it('updates fields and recomputes metrics when data provided', async () => {
            const existing: any = {
                _id: 'doc-1',
                deviceId: 'old',
                time: 10,
                data: [[1, [1000, 1000, 1000]]] as XRayTuple[],
                save: jest.fn(),
            };

            const savedDoc = {
                toObject: () => ({
                    _id: 'doc-1',
                    deviceId: 'new-dev',
                    time: 123,
                    data: [
                        [1, [2222, 2222, 2222]],
                        [2, [2222, 2222, 2222]],
                    ] as XRayTuple[],
                    dataLength: 2,
                    dataVolume: 3,
                }),
            };

            existing.save.mockResolvedValueOnce(savedDoc);
            findByIdChain.exec = jest.fn().mockResolvedValueOnce(existing);

            const dto = {
                deviceId: 'new-dev',
                time: 123,
                data: [
                    [1, [2222, 2222, 2222]],
                    [2, [2222, 2222, 2222]],
                ] as XRayTuple[],
            };

            const result = await service.update('doc-1', dto as any);

            expect(existing.deviceId).toBe('new-dev');
            expect(existing.time).toBe(123);
            expect(existing.dataLength).toBe(2);
            expect(existing.dataVolume).toBe(3);
            expect(existing.save).toHaveBeenCalledTimes(1);

            expect(result).toEqual(savedDoc.toObject());
        });

        it('throws NotFoundException when missing', async () => {
            findByIdChain.exec = jest.fn().mockResolvedValueOnce(null);

            await expect(
                service.update('nope', {} as any),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('wraps unexpected errors as InternalServerErrorException', async () => {
            findByIdChain.exec = jest
                .fn()
                .mockRejectedValueOnce(new Error('db read failed'));

            await expect(service.update('x', {} as any)).rejects.toBeInstanceOf(
                InternalServerErrorException,
            );
        });
    });

    describe('remove', () => {
        it('deletes and returns true', async () => {
            findByIdAndDeleteExec.mockResolvedValueOnce({ _id: 'gone' });

            const res = await service.remove('gone');

            expect(ModelCtor.findByIdAndDelete).toHaveBeenCalledWith('gone');
            expect(res).toBe(true);
        });

        it('throws NotFoundException when nothing to delete', async () => {
            findByIdAndDeleteExec.mockResolvedValueOnce(null);

            await expect(service.remove('missing')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('wraps unexpected errors as InternalServerErrorException', async () => {
            findByIdAndDeleteExec.mockRejectedValueOnce(
                new Error('db delete failed'),
            );

            await expect(service.remove('x')).rejects.toBeInstanceOf(
                InternalServerErrorException,
            );
        });
    });
});
