import { z } from 'zod';
import { Weekday } from './clinics.ts';

export const SLOT_MINUTES = [15, 20, 30, 45, 60] as const;
/** Patients may cancel until this many hours before the start. */
export const CANCEL_CUTOFF_HOURS = 24;

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

/** A Slot as the public sees it: no patient details. */
export const PublicSlot = z.object({
  id: z.string(),
  dentistId: z.string(),
  startsAt: z.string(),
  minutes: z.number(),
  taken: z.boolean(),
});
export type PublicSlot = z.infer<typeof PublicSlot>;

export const SlotQuery = z.strictObject({
  from: isoDate,
  days: z.coerce.number().int().min(1).max(14).default(7),
  dentistId: objectId.optional(),
});
export type SlotQuery = z.infer<typeof SlotQuery>;

export const BookInput = z.strictObject({
  reason: z.string().trim().max(200).optional(),
});
export type BookInput = z.infer<typeof BookInput>;

export const Appointment = z.object({
  id: z.string(),
  startsAt: z.string(),
  minutes: z.number(),
  reason: z.string(),
  clinic: z.object({ id: z.string(), slug: z.string(), name: z.string(), address: z.string() }),
  dentist: z.object({ id: z.string(), name: z.string(), title: z.string(), avatar: z.string() }),
  canCancel: z.boolean(),
});
export type Appointment = z.infer<typeof Appointment>;

/** A Slot as its Dentist sees it, with the Patient when booked. */
export const ScheduleSlot = z.object({
  id: z.string(),
  clinicId: z.string(),
  clinicName: z.string(),
  startsAt: z.string(),
  minutes: z.number(),
  patient: z.object({ name: z.string(), email: z.string(), reason: z.string() }).nullable(),
});
export type ScheduleSlot = z.infer<typeof ScheduleSlot>;

export const ScheduleQuery = z.strictObject({
  from: isoDate,
  days: z.coerce.number().int().min(1).max(14).default(7),
});
export type ScheduleQuery = z.infer<typeof ScheduleQuery>;

/** Open many Slots at once, e.g. Mon–Fri 09:00–17:00 every 30 min. */
export const OpenSlotsInput = z
  .strictObject({
    clinicId: objectId,
    from: isoDate,
    to: isoDate,
    weekdays: z.array(Weekday).min(1, 'Pick at least one day'),
    start: hhmm,
    end: hhmm,
    minutes: z.literal(SLOT_MINUTES),
  })
  .refine((v) => v.start < v.end, { path: ['end'], message: 'End must be after start' })
  .refine((v) => v.from <= v.to, { path: ['to'], message: 'End date must be after start date' })
  .refine((v) => daysBetween(v.from, v.to) <= 62, {
    path: ['to'],
    message: 'Open at most two months at a time',
  });
export type OpenSlotsInput = z.infer<typeof OpenSlotsInput>;

export const OpenSlotsResult = z.object({ created: z.number(), skipped: z.number() });
export type OpenSlotsResult = z.infer<typeof OpenSlotsResult>;

function daysBetween(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

export const SlotList = z.object({ slots: z.array(PublicSlot) });
export const AppointmentList = z.object({ upcoming: z.array(Appointment), past: z.array(Appointment) });
export type AppointmentList = z.infer<typeof AppointmentList>;
export const BookResult = z.object({ appointment: Appointment });
export const Schedule = z.object({ slots: z.array(ScheduleSlot) });
export type Schedule = z.infer<typeof Schedule>;
/** Patients can hold this many upcoming Appointments at once. */
export const MAX_UPCOMING = 5;
