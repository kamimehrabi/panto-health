import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Signal, SignalSchema } from './schemas/signals.schema';
import { SignalsService } from './signals.service';
import { SignalsController } from './signals.controller';

@Module({

    imports: [
        MongooseModule.forFeature([
            { name: Signal.name, schema: SignalSchema },
        ]),
    ],
    providers: [SignalsService],
    exports: [SignalsService],
    controllers: [SignalsController],
})
export class SignalsModule {}
