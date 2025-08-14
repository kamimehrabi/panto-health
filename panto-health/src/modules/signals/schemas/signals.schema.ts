import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type XRayDataPoint = [number, [number, number, number]];

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

    @Prop({ required: true, type: [[Number, [Number, Number, Number]]] })
    data: XRayDataPoint[];
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
