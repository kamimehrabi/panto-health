import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { XRayDataPoint } from 'src/types/xray.types';

export type SignalDocument = HydratedDocument<Signal>;

@Schema({ timestamps: true })
export class Signal {
    @Prop({ required: true })
    deviceId: string;

    @Prop({ required: true, type: Number })
    time: number; 

    @Prop({ required: true })
    dataLength: number;

    @Prop({ required: true })
    dataVolume: number;

    @Prop({ required: true, type: [MongooseSchema.Types.Mixed] })
    data: XRayDataPoint[];
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
