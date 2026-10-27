import { Schema, type InferSchemaType } from 'mongoose';

/** A Patient or a Dentist; the role decides what they can do. */
export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['patient', 'dentist'], required: true },
    // Dentist only
    title: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '#22c7a0' },
    clinicIds: [{ type: Schema.Types.ObjectId, ref: 'Clinic' }],
  },
  { timestamps: true },
);
userSchema.index({ role: 1, clinicIds: 1 });

export type User = InferSchemaType<typeof userSchema>;
