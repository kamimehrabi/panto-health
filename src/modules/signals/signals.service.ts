import {
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder } from 'mongoose';
import { Signal, SignalDocument } from './schemas/signals.schema';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { XRayDataPoint } from 'src/types/xray.types';

type ListFilters = {
    deviceId?: string;
    from?: number;
    to?: number;
    minDataLength?: number;
    maxDataLength?: number;
    minVolume?: number;
    maxVolume?: number;
};

@Injectable()
export class SignalsService {
    private readonly logger = new Logger(SignalsService.name);

    constructor(
        @InjectModel(Signal.name)
        private readonly signalModel: Model<SignalDocument>,
    ) {}

    async processAndSaveXrayData(
        deviceId: string,
        dataPayload: { data: XRayDataPoint[]; time: number },
    ): Promise<SignalDocument> {
        this.logger.log(`Processing raw x-ray data for device: ${deviceId}...`);

        const { time, data } = dataPayload;

        const { dataLength, dataVolume } = this.computeMetrics(data);

        const newSignal = new this.signalModel({
            deviceId,
            time,
            dataLength,
            dataVolume,
            data,
        });

        try {
            const savedSignal = await newSignal.save();
            this.logger.log(
                `Signal saved successfully with id: ${savedSignal._id}`,
            );
            return savedSignal;
        } catch (error) {
            this.logger.error('Failed to save signal to MongoDB', error.stack);
            throw error;
        }
    }

    async createViaHttp(dto: CreateSignalDto) {
        try {
            return await this.processAndSaveXrayData(dto.deviceId, {
                time: dto.time,
                data: dto.data,
            });
        } catch (error) {
            this.logger.error('Failed to create signal via HTTP', error.stack);
            throw new InternalServerErrorException(
                'Failed to create signal due to a server error.',
            );
        }
    }

    async findAllPaged(
        page = 1,
        limit = 20,
        sortOrder: 'newest' | 'oldest' = 'newest',
        filters: ListFilters = {},
    ) {
        try {
            const skip = Math.max(0, (page - 1) * limit);
            const sortBy: Record<string, SortOrder> =
                sortOrder === 'oldest'
                    ? { createdAt: 'asc' }
                    : { createdAt: 'desc' };
            const query: FilterQuery<SignalDocument> = {};

            if (filters.deviceId) query.deviceId = filters.deviceId;
            if (filters.from || filters.to) {
                query.time = {};
                if (filters.from) query.time.$gte = filters.from;
                if (filters.to) query.time.$lte = filters.to;
            }
            if (filters.minDataLength || filters.maxDataLength) {
                query.dataLength = {};
                if (filters.minDataLength)
                    query.dataLength.$gte = filters.minDataLength;
                if (filters.maxDataLength)
                    query.dataLength.$lte = filters.maxDataLength;
            }
            if (filters.minVolume || filters.maxVolume) {
                query.dataVolume = {};
                if (filters.minVolume)
                    query.dataVolume.$gte = filters.minVolume;
                if (filters.maxVolume)
                    query.dataVolume.$lte = filters.maxVolume;
            }

            const [items, total] = await Promise.all([
                this.signalModel
                    .find(query)
                    .sort(sortBy)
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.signalModel.countDocuments(query).exec(),
            ]);

            return { items, total, page, limit };
        } catch (error) {
            this.logger.error(
                'Failed to retrieve signals from the database',
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve signals due to a server error.',
            );
        }
    }

    async findOne(id: string) {
        try {
            const signal = await this.signalModel.findById(id).lean().exec();
            if (!signal) {
                this.logger.warn(`Signal with ID "${id}" not found.`);
                throw new NotFoundException(`Signal with id ${id} not found.`);
            }
            return signal;
        } catch (error) {
            this.logger.error(
                `Error finding signal with id "${id}"`,
                error.stack,
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Failed to retrieve signal due to a server error.',
            );
        }
    }

    async update(id: string, dto: UpdateSignalDto) {
        try {
            const foundSignal = await this.signalModel.findById(id).exec();
            if (!foundSignal) {
                throw new NotFoundException(`Signal with id ${id} not found.`);
            }

            if (dto.deviceId !== undefined) foundSignal.deviceId = dto.deviceId;
            if (dto.time !== undefined) foundSignal.time = dto.time;
            if (dto.data !== undefined) {
                foundSignal.data = dto.data as unknown as XRayDataPoint[];
                const { dataLength, dataVolume } = this.computeMetrics(
                    foundSignal.data,
                );
                foundSignal.dataLength = dataLength;
                foundSignal.dataVolume = dataVolume;
            }

            const saved = await foundSignal.save();
            return saved.toObject();
        } catch (error) {
            this.logger.error(
                `Error updating signal with id "${id}"`,
                error.stack,
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Failed to update signal due to a server error.',
            );
        }
    }

    async remove(id: string) {
        try {
            const foundSignal = await this.signalModel
                .findByIdAndDelete(id)
                .lean()
                .exec();
            if (!foundSignal) {
                throw new NotFoundException(`Signal with id ${id} not found.`);
            }
            return !!foundSignal;
        } catch (error) {
            this.logger.error(
                `Error removing signal with id "${id}"`,
                error.stack,
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Failed to remove signal due to a server error.',
            );
        }
    }

    private computeMetrics(data: XRayDataPoint[]) {
        const dataLength = Array.isArray(data) ? data.length : 0;
        const dataVolume = data.reduce((sum, [value]) => sum + value, 0);
        return { dataLength, dataVolume };
    }
}
