import { Schema, type InferSchemaType } from 'mongoose';

export const emailSchema = new Schema({
  kind: { type: String, enum: ['booked', 'cancelled', 'welcome'], required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  text: { type: String, required: true },
  sentAt: { type: Date, default: () => new Date() },
});
emailSchema.index({ sentAt: -1 });

export type Email = InferSchemaType<typeof emailSchema>;
