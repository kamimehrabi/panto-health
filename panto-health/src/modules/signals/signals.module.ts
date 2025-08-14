// src/signals/signals.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Signal, SignalSchema } from './schemas/signals.schema';
import { SignalsService } from './signals.service';

@Module({
    // The MongooseModule.forFeature() method registers the schema with Mongoose.
    // This makes the Signal model available for injection in this module's providers.
    imports: [
        MongooseModule.forFeature([
            { name: Signal.name, schema: SignalSchema },
        ]),
    ],
    // The providers array declares which services are available in this module.
    providers: [SignalsService],
    // We export SignalService so it can be used by other modules that import SignalsModule.
    exports: [SignalsService],
})
export class SignalsModule {}
