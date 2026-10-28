import { Schema, type InferSchemaType } from 'mongoose';

const booking = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
    bookedAt: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * A Slot is open while `booking` is null. Booking sets it in one atomic update,
 * so the Slot and its Appointment can never disagree.
 */
export const slotSchema = new Schema({
  clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
  dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startsAt: { type: Date, required: true },
  minutes: { type: Number, required: true },
  booking: { type: booking, default: null },
});
slotSchema.index({ dentistId: 1, startsAt: 1 }, { unique: true });
slotSchema.index({ clinicId: 1, startsAt: 1 });
slotSchema.index({ 'booking.patientId': 1, startsAt: 1 });

export type Slot = InferSchemaType<typeof slotSchema>;
