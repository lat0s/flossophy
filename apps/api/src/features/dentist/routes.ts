import { Types } from 'mongoose';
import {
  OpenSlotsInput,
  OpenSlotsResult,
  Schedule,
  ScheduleQuery,
  addDays,
  weekdayOf,
  zonedTime,
} from '@flossophy/shared';
import { z } from 'zod';
import { HttpError, notFound } from '../../core/errors.ts';
import { IdParam, route } from '../../core/route.ts';

const DentistClinics = z.object({
  clinics: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});

/** Cuts a day into Slots and keeps only those inside the clinic's opening hours. */
export function plannedSlots(
  input: OpenSlotsInput,
  hours: Record<string, { open?: string | null; close?: string | null } | null | undefined>,
) {
  const out: { startsAt: Date; minutes: number }[] = [];
  let skipped = 0;
  for (let day = input.from; day <= input.to; day = addDays(day, 1)) {
    const wd = weekdayOf(day);
    if (!input.weekdays.includes(wd)) continue;
    const h = hours[wd];
    const [sh, sm] = input.start.split(':').map(Number) as [number, number];
    const [eh, em] = input.end.split(':').map(Number) as [number, number];
    for (let m = sh * 60 + sm; m + input.minutes <= eh * 60 + em; m += input.minutes) {
      const hhmm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const endHhmm = `${String(Math.floor((m + input.minutes) / 60)).padStart(2, '0')}:${String((m + input.minutes) % 60).padStart(2, '0')}`;
      if (!h?.open || !h.close || hhmm < h.open || endHhmm > h.close) {
        skipped++;
        continue;
      }
      out.push({ startsAt: zonedTime(day, hhmm), minutes: input.minutes });
    }
  }
  return { slots: out, skipped };
}

export function dentistRoutes() {
  return [
    route({
      method: 'get',
      path: '/dentist/clinics',
      tag: 'Dentist',
      summary: 'Clinics the signed-in Dentist works at',
      auth: 'dentist',
      response: DentistClinics,
      async handler(ctx, { session }) {
        const me = await ctx.state.db.User.findById(session.userId).lean();
        const clinics = await ctx.state.db.Clinic.find({ _id: { $in: me?.clinicIds ?? [] } }).lean();
        return { clinics: clinics.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug })) };
      },
    }),

    route({
      method: 'get',
      path: '/dentist/schedule',
      tag: 'Dentist',
      summary: "The signed-in Dentist's Slots with who booked them",
      auth: 'dentist',
      query: ScheduleQuery,
      response: Schedule,
      async handler(ctx, { query, session }) {
        const { db } = ctx.state;
        const slots = await db.Slot.find({
          dentistId: session.userId,
          startsAt: { $gte: zonedTime(query.from, '00:00'), $lt: zonedTime(addDays(query.from, query.days), '00:00') },
        })
          .sort({ startsAt: 1 })
          .lean();
        const [clinics, patients] = await Promise.all([
          db.Clinic.find({ _id: { $in: slots.map((s) => s.clinicId) } }).lean(),
          db.User.find({ _id: { $in: slots.flatMap((s) => (s.booking ? [s.booking.patientId] : [])) } }).lean(),
        ]);
        const c = new Map(clinics.map((x) => [String(x._id), x.name]));
        const p = new Map(patients.map((x) => [String(x._id), x]));
        return {
          slots: slots.map((s) => {
            const patient = s.booking ? p.get(String(s.booking.patientId)) : undefined;
            return {
              id: String(s._id),
              clinicId: String(s.clinicId),
              clinicName: c.get(String(s.clinicId)) ?? '',
              startsAt: s.startsAt.toISOString(),
              minutes: s.minutes,
              patient: s.booking
                ? { name: patient?.name ?? 'Former patient', email: patient?.email ?? '', reason: s.booking.reason }
                : null,
            };
          }),
        };
      },
    }),

    route({
      method: 'post',
      path: '/dentist/slots',
      tag: 'Dentist',
      summary: 'Open many Slots at once, skipping clashes, the past and closed hours',
      auth: 'dentist',
      body: OpenSlotsInput,
      response: OpenSlotsResult,
      status: 201,
      async handler(ctx, { body, session }) {
        const { db } = ctx.state;
        const me = await db.User.findById(session.userId).lean();
        if (!me?.clinicIds.some((id) => String(id) === body.clinicId)) {
          throw new HttpError(403, 'forbidden', "You don't work at that clinic");
        }
        const clinic = await db.Clinic.findById(body.clinicId).lean();
        if (!clinic) throw notFound('Clinic');
        const plan = plannedSlots(body, JSON.parse(JSON.stringify(clinic.openingHours ?? {})));
        if (plan.slots.length > 1500) throw new HttpError(400, 'bad_request', 'That is too many Slots at once');

        const now = Date.now();
        const first = plan.slots[0]?.startsAt;
        const last = plan.slots.at(-1)?.startsAt;
        const existing = first
          ? await db.Slot.find({
              dentistId: session.userId,
              startsAt: { $gte: new Date(first.getTime() - 3 * 3600_000), $lte: last },
            }).lean()
          : [];
        const overlaps = (s: { startsAt: Date; minutes: number }) =>
          existing.some(
            (e) =>
              e.startsAt.getTime() < s.startsAt.getTime() + s.minutes * 60_000 &&
              s.startsAt.getTime() < e.startsAt.getTime() + e.minutes * 60_000,
          );

        const fresh = plan.slots.filter((s) => s.startsAt.getTime() > now && !overlaps(s));
        if (fresh.length) {
          await db.Slot.insertMany(
            fresh.map((s) => ({
              ...s,
              clinicId: clinic._id,
              dentistId: new Types.ObjectId(session.userId),
              booking: null,
            })),
            { ordered: false },
          );
        }
        return { created: fresh.length, skipped: plan.skipped + plan.slots.length - fresh.length };
      },
    }),

    route({
      method: 'delete',
      path: '/dentist/slots/:id',
      tag: 'Dentist',
      summary: 'Close one of your open Slots (booked ones stay)',
      auth: 'dentist',
      params: IdParam,
      async handler(ctx, { params, session }) {
        const res = await ctx.state.db.Slot.deleteOne({ _id: params.id, dentistId: session.userId, booking: null });
        if (res.deletedCount === 1) return undefined;
        const slot = await ctx.state.db.Slot.findOne({ _id: params.id, dentistId: session.userId }).lean();
        if (!slot) throw notFound('Slot');
        throw new HttpError(409, 'conflict', 'That Slot is booked. Only the patient can cancel it.');
      },
    }),
  ];
}
