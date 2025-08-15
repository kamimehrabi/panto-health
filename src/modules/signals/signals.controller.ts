import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    NotFoundException,
} from '@nestjs/common';
import { SignalsService } from './signals.service';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { CreateSignalDto } from './dto/create-signal.dto';
import { ListSignalsQueryDto } from './dto/list-signals.dto';

@Controller('signals')
export class SignalsController {
    constructor(private readonly signals: SignalsService) {}

    @Post()
    async create(@Body() dto: CreateSignalDto) {
        return this.signals.createViaHttp(dto);
    }

    @Get()
    async findAll(@Query() dto: ListSignalsQueryDto) {
        const { page = 1, limit = 20, sort = 'newest', ...filters } = dto;
        return this.signals.findAllPaged(page, limit, sort, filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const doc = await this.signals.findOne(id);
        if (!doc) throw new NotFoundException('Signal not found');
        return doc;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateSignalDto) {
        const doc = await this.signals.update(id, dto);
        if (!doc) throw new NotFoundException('Signal not found');
        return doc;
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Param('id') id: string) {
        const ok = await this.signals.remove(id);
        if (!ok) throw new NotFoundException('Signal not found');
        return;
    }
}
