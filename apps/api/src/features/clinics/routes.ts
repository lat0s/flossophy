import { z } from 'zod';
import { ClinicDetail, ClinicList, ClinicQuery, type ClinicSummary, distanceKm } from '@flossophy/shared';
import type { Db } from '../../core/db.ts';
import { notFound } from '../../core/errors.ts';
import { route } from '../../core/route.ts';

type ClinicDoc = Awaited<ReturnType<Db['Clinic']['findOne']>> & {};

function summary(c: ClinicDoc, next: Date | undefined): ClinicSummary {
  return {
    id: String(c._id),
    slug: c.slug,
    name: c.name,
    address: c.address,
    area: c.area,
    lat: c.lat,
    lng: c.lng,
    color: c.color,
    tags: c.tags,
    openingHours: JSON.parse(JSON.stringify(c.openingHours ?? {})),
    nextOpenSlot: next ? next.toISOString() : null,
  };
}

/** Earliest open future Slot per clinic, in one aggregate. */
async function nextOpenSlots(db: Db, clinicIds?: unknown[]) {
  const rows = await db.Slot.aggregate<{ _id: unknown; next: Date }>([
    { $match: { booking: null, startsAt: { $gt: new Date() }, ...(clinicIds && { clinicId: { $in: clinicIds } }) } },
    { $group: { _id: '$clinicId', next: { $min: '$startsAt' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.next]));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function clinicRoutes() {
  return [
    route({
      method: 'get',
      path: '/clinics',
      tag: 'Clinics',
      summary: 'List clinics, optionally searched and sorted by distance',
      query: ClinicQuery,
      response: ClinicList,
      async handler(ctx, { query }) {
        const { db } = ctx.state;
        const filter = query.q
          ? {
              $or: ['name', 'area', 'tags', 'address'].map((f) => ({
                [f]: { $regex: escape(query.q!), $options: 'i' },
              })),
            }
          : {};
        const clinics = await db.Clinic.find(filter).lean();
        const next = await nextOpenSlots(
          db,
          clinics.map((c) => c._id),
        );
        let list = clinics.map((c) => summary(c as ClinicDoc, next.get(String(c._id))));
        if (query.near) {
          const [lat, lng] = query.near.split(',').map(Number) as [number, number];
          list = list
            .map((c) => ({ ...c, distanceKm: Math.round(distanceKm({ lat, lng }, c) * 10) / 10 }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
        } else {
          list.sort((a, b) => (a.nextOpenSlot ?? '~').localeCompare(b.nextOpenSlot ?? '~'));
        }
        return { clinics: list };
      },
    }),
    route({
      method: 'get',
      path: '/clinics/:slug',
      tag: 'Clinics',
      summary: 'One clinic with its dentists',
      params: z.strictObject({ slug: z.string().regex(/^[a-z0-9-]{1,60}$/) }),
      response: ClinicDetail,
      async handler(ctx, { params }) {
        const { db } = ctx.state;
        const clinic = await db.Clinic.findOne({ slug: params.slug }).lean();
        if (!clinic) throw notFound('Clinic');
        const [dentists, next] = await Promise.all([
          db.User.find({ role: 'dentist', clinicIds: clinic._id }).sort({ name: 1 }).lean(),
          nextOpenSlots(db, [clinic._id]),
        ]);
        return {
          ...summary(clinic as ClinicDoc, next.get(String(clinic._id))),
          about: clinic.about,
          phone: clinic.phone,
          dentists: dentists.map((d) => ({
            id: String(d._id),
            name: d.name,
            title: d.title,
            bio: d.bio,
            avatar: d.avatar,
          })),
        };
      },
    }),
  ];
}
