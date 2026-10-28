import { Schema, type InferSchemaType } from 'mongoose';

const hours = new Schema({ open: String, close: String }, { _id: false });

export const clinicSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  area: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  color: { type: String, required: true },
  tags: [String],
  about: { type: String, default: '' },
  phone: { type: String, default: '' },
  openingHours: {
    mon: hours,
    tue: hours,
    wed: hours,
    thu: hours,
    fri: hours,
    sat: hours,
    sun: hours,
  },
});

export type Clinic = InferSchemaType<typeof clinicSchema>;
