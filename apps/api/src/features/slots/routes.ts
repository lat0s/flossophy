import { Types } from 'mongoose';
import {
  AppointmentList,
  BookInput,
  BookResult,
  CANCEL_CUTOFF_HOURS,
  CLINIC_TIME_ZONE,
  MAX_UPCOMING,
  SlotList,
  SlotQuery,
  type Appointment,
  addDays,
  canCancel,
  zonedTime,
} from '@flossophy/shared';
import type { Db } from '../../core/db.ts';
import { HttpError, notFound } from '../../core/errors.ts';
import { IdParam, route } from '../../core/route.ts';
import { type Mailer, sendEmail } from '../outbox/mailer.ts';

const when = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, dateStyle: 'full', timeStyle: 'short' }).format(d);

/** Booked Slots of one Patient, joined with clinic and dentist, as Appointments. */
export async function appointmentsOf(db: Db, filter: Record<string, unknown>, sort: 1 | -1, limit = 50) {
  const slots = await db.Slot.find({ booking: { $ne: null }, ...filter })
    .sort({ startsAt: sort })
    .limit(limit)
    .lean();
  const [clinics, dentists] = await Promise.all([
    db.Clinic.find({ _id: { $in: slots.map((s) => s.clinicId) } }).lean(),
    db.User.find({ _id: { $in: slots.map((s) => s.dentistId) } }).lean(),
  ]);
  const c = new Map(clinics.map((x) => [String(x._id), x]));
  const d = new Map(dentists.map((x) => [String(x._id), x]));
  return slots.map((s): Appointment => {
    const clinic = c.get(String(s.clinicId))!;
    const dentist = d.get(String(s.dentistId))!;
    return {
      id: String(s._id),
      startsAt: s.startsAt.toISOString(),
      minutes: s.minutes,
      reason: s.booking?.reason ?? '',
      clinic: { id: String(clinic._id), slug: clinic.slug, name: clinic.name, address: clinic.address },
      dentist: { id: String(dentist._id), name: dentist.name, title: dentist.title, avatar: dentist.avatar },
      canCancel: canCancel(s.startsAt),
    };
  });
}

export function slotRoutes(mailer: Mailer) {
  return [
    route({
      method: 'get',
      path: '/clinics/:id/slots',
      tag: 'Slots',
      summary: "A clinic's upcoming Slots (open and taken, no patient details)",
      params: IdParam,
      query: SlotQuery,
      response: SlotList,
      async handler(ctx, { params, query }) {
        const from = zonedTime(query.from, '00:00');
        const to = zonedTime(addDays(query.from, query.days), '00:00');
        const now = new Date();
        const slots = await ctx.state.db.Slot.find({
          clinicId: params.id,
          startsAt: { $gte: from > now ? from : now, $lt: to },
          ...(query.dentistId && { dentistId: query.dentistId }),
        })
          .sort({ startsAt: 1 })
          .limit(2000)
          .lean();
        return {
          slots: slots.map((s) => ({
            id: String(s._id),
            dentistId: String(s.dentistId),
            startsAt: s.startsAt.toISOString(),
            minutes: s.minutes,
            taken: s.booking !== null,
          })),
        };
      },
    }),

    route({
      method: 'post',
      path: '/slots/:id/book',
      tag: 'Appointments',
      summary: 'Book an open Slot. 409 when someone else just took it',
      auth: 'patient',
      params: IdParam,
      body: BookInput,
      response: BookResult,
      status: 201,
      async handler(ctx, { params, body, session }) {
        const { db } = ctx.state;
        const patientId = new Types.ObjectId(session.userId);
        const now = new Date();

        const upcoming = await db.Slot.countDocuments({ 'booking.patientId': patientId, startsAt: { $gt: now } });
        if (upcoming >= MAX_UPCOMING) {
          throw new HttpError(409, 'conflict', `You already have ${MAX_UPCOMING} upcoming visits. Cancel one first.`);
        }
        const target = await db.Slot.findById(params.id).lean();
        if (!target) throw notFound('Slot');
        const end = new Date(target.startsAt.getTime() + target.minutes * 60_000);
        const clash = await db.Slot.exists({
          'booking.patientId': patientId,
          startsAt: { $lt: end, $gte: new Date(target.startsAt.getTime() - 2 * 3600_000) },
        });
        if (clash) throw new HttpError(409, 'conflict', 'You already have a visit around that time');

        // The whole race is decided here: only one update can see booking === null.
        const slot = await db.Slot.findOneAndUpdate(
          { _id: params.id, booking: null, startsAt: { $gt: now } },
          { $set: { booking: { patientId, reason: body.reason ?? '', bookedAt: now } } },
          { returnDocument: 'after' },
        ).lean();
        if (!slot) {
          if (target.startsAt <= now) throw new HttpError(409, 'conflict', 'That time has already passed');
          throw new HttpError(409, 'conflict', 'Someone just booked that time. Pick another one?');
        }

        const [appointment] = await appointmentsOf(db, { _id: slot._id }, 1);
        const [patient, dentist] = await Promise.all([
          db.User.findById(patientId).lean(),
          db.User.findById(slot.dentistId).lean(),
        ]);
        const a = appointment!;
        await sendEmail(db, mailer, {
          kind: 'booked',
          to: patient!.email,
          subject: `Booked: ${a.clinic.name}, ${when(slot.startsAt)}`,
          text: `Hi ${patient!.name},\n\nYou're booked with ${a.dentist.name} at ${a.clinic.name} (${a.clinic.address}) on ${when(slot.startsAt)}.\n\nNeed to change plans? You can cancel in the app until ${CANCEL_CUTOFF_HOURS} hours before.\n\nSee you soon,\nFlossy`,
        });
        await sendEmail(db, mailer, {
          kind: 'booked',
          to: dentist!.email,
          subject: `New booking: ${patient!.name}, ${when(slot.startsAt)}`,
          text: `${patient!.name} booked ${when(slot.startsAt)} at ${a.clinic.name}.${a.reason ? `\nReason: ${a.reason}` : ''}`,
        });
        return { appointment: a };
      },
    }),

    route({
      method: 'get',
      path: '/me/appointments',
      tag: 'Appointments',
      summary: "The signed-in Patient's Appointments",
      auth: 'patient',
      response: AppointmentList,
      async handler(ctx, { session }) {
        const patientId = new Types.ObjectId(session.userId);
        const now = new Date();
        const [upcoming, past] = await Promise.all([
          appointmentsOf(ctx.state.db, { 'booking.patientId': patientId, startsAt: { $gt: now } }, 1),
          appointmentsOf(ctx.state.db, { 'booking.patientId': patientId, startsAt: { $lte: now } }, -1, 10),
        ]);
        return { upcoming, past };
      },
    }),

    route({
      method: 'delete',
      path: '/me/appointments/:id',
      tag: 'Appointments',
      summary: `Cancel your own Appointment (until ${CANCEL_CUTOFF_HOURS}h before). Reopens the Slot`,
      auth: 'patient',
      params: IdParam,
      async handler(ctx, { params, session }) {
        const { db } = ctx.state;
        const patientId = new Types.ObjectId(session.userId);
        const cutoff = new Date(Date.now() + CANCEL_CUTOFF_HOURS * 3600_000);
        const [appointment] = await appointmentsOf(db, { _id: params.id, 'booking.patientId': patientId }, 1);
        // Not yours looks the same as not there.
        if (!appointment) throw notFound('Appointment');
        const slot = await db.Slot.findOneAndUpdate(
          { _id: params.id, 'booking.patientId': patientId, startsAt: { $gte: cutoff } },
          { $set: { booking: null } },
        ).lean();
        if (!slot) {
          throw new HttpError(
            409,
            'conflict',
            `Visits can only be cancelled up to ${CANCEL_CUTOFF_HOURS} hours before. Call the clinic instead.`,
          );
        }
        const [patient, dentist] = await Promise.all([
          db.User.findById(patientId).lean(),
          db.User.findById(slot.dentistId).lean(),
        ]);
        const at = when(slot.startsAt);
        await sendEmail(db, mailer, {
          kind: 'cancelled',
          to: patient!.email,
          subject: `Cancelled: ${appointment.clinic.name}, ${at}`,
          text: `Hi ${patient!.name},\n\nYour visit with ${appointment.dentist.name} on ${at} is cancelled. The time is open for someone else now.\n\nFlossy`,
        });
        await sendEmail(db, mailer, {
          kind: 'cancelled',
          to: dentist!.email,
          subject: `Cancelled: ${patient!.name}, ${at}`,
          text: `${patient!.name} cancelled ${at}. The Slot is open again.`,
        });
        return undefined;
      },
    }),
  ];
}
