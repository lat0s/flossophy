import { z } from 'zod';

export const Weekday = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export type Weekday = z.infer<typeof Weekday>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const OpeningHours = z.partialRecord(Weekday, z.object({ open: hhmm, close: hhmm }));
export type OpeningHours = z.infer<typeof OpeningHours>;

export const DentistSummary = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string(),
  avatar: z.string(),
});
export type DentistSummary = z.infer<typeof DentistSummary>;

export const ClinicSummary = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  address: z.string(),
  area: z.string(),
  lat: z.number(),
  lng: z.number(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  tags: z.array(z.string()),
  openingHours: OpeningHours,
  /** Kilometres from the `near` point, when one was given. */
  distanceKm: z.number().optional(),
  nextOpenSlot: z.string().nullable(),
});
export type ClinicSummary = z.infer<typeof ClinicSummary>;

export const ClinicDetail = ClinicSummary.extend({
  about: z.string(),
  phone: z.string(),
  dentists: z.array(DentistSummary),
});
export type ClinicDetail = z.infer<typeof ClinicDetail>;

export const ClinicQuery = z.strictObject({
  q: z.string().trim().max(60).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'Use lat,lng')
    .optional(),
});
export type ClinicQuery = z.infer<typeof ClinicQuery>;

export const ClinicList = z.object({ clinics: z.array(ClinicSummary) });
export type ClinicList = z.infer<typeof ClinicList>;
