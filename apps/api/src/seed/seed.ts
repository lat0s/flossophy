import { CLINIC_TIME_ZONE, addDays, weekdayOf, zonedDate, zonedTime } from '@flossophy/shared';
import { Types } from 'mongoose';
import type { Db } from '../core/db.ts';
import { CLINICS, DEMO_PASSWORD, DEMO_PATIENT, DENTISTS, OTHER_PATIENTS, REASONS } from './data.ts';

/** Small deterministic PRNG so every sandbox looks the same. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills an empty database: clinics, dentists, patients and two weeks of Slots
 * around `now`, about a third already booked. `passwordHash` is precomputed
 * because argon2 is slow on purpose and sandboxes are created on demand.
 */
export async function seed(db: Db, passwordHash: string, now = new Date()) {
  const rand = rng(42);
  const clinics = await db.Clinic.insertMany(CLINICS);
  const bySlug = new Map(clinics.map((c) => [c.slug, c]));

  const dentists = await db.User.insertMany(
    DENTISTS.map(({ clinics: slugs, ...d }) => ({
      ...d,
      role: 'dentist',
      passwordHash,
      clinicIds: slugs.map((s) => bySlug.get(s)!._id),
    })),
  );
  const patients = await db.User.insertMany(
    [
      DEMO_PATIENT,
      ...OTHER_PATIENTS.map((name) => ({ name, email: `${name.split(' ')[0]!.toLowerCase()}@example.com` })),
    ].map((p) => ({
      ...p,
      role: 'patient',
      passwordHash,
    })),
  );
  const [alex, ...others] = patients;

  const today = zonedDate(now, CLINIC_TIME_ZONE);
  const slots: {
    clinicId: Types.ObjectId;
    dentistId: Types.ObjectId;
    startsAt: Date;
    minutes: number;
    booking: unknown;
  }[] = [];
  for (const [i, d] of dentists.entries()) {
    const clinic = bySlug.get(DENTISTS[i]!.clinics[0]!)!;
    const minutes = clinic.slug === 'gentle-gums' ? 45 : 30;
    for (let offset = -7; offset <= 14; offset++) {
      const day = addDays(today, offset);
      const h = (clinic.openingHours as Record<string, { open?: string; close?: string } | undefined>)[weekdayOf(day)];
      if (!h?.open || !h.close) continue;
      const [oh, om] = h.open.split(':').map(Number) as [number, number];
      const [ch, cm] = h.close.split(':').map(Number) as [number, number];
      for (let m = oh * 60 + om; m + minutes <= ch * 60 + cm; m += minutes) {
        if (m >= 12 * 60 && m < 13 * 60) continue; // lunch
        if (rand() < 0.3) continue; // not every time is offered
        const startsAt = zonedTime(
          day,
          `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
        );
        const past = startsAt < now;
        const booked = past ? rand() < 0.7 : rand() < 0.35;
        slots.push({
          clinicId: clinic._id,
          dentistId: d._id,
          startsAt,
          minutes,
          booking: booked
            ? {
                patientId: others[Math.floor(rand() * others.length)]!._id,
                reason: REASONS[Math.floor(rand() * REASONS.length)]!,
                bookedAt: now,
              }
            : null,
        });
      }
    }
  }

  // Alex gets a past visit, one too soon to cancel and one that can be cancelled.
  const sara = dentists[0]!;
  const saraOpen = slots.filter((s) => s.dentistId.equals(sara._id) && !s.booking);
  const hours = (s: { startsAt: Date }) => (s.startsAt.getTime() - now.getTime()) / 3600_000;
  const picks = [
    saraOpen.filter((s) => hours(s) < -24).at(-1),
    saraOpen.find((s) => hours(s) > 2 && hours(s) < 24),
    saraOpen.find((s) => hours(s) > 72),
  ];
  for (const [i, s] of picks.entries()) {
    if (s)
      s.booking = { patientId: alex!._id, reason: ['Check-up', 'Cleaning', 'Whitening consult'][i], bookedAt: now };
  }

  await db.Slot.insertMany(slots);
  return { clinics: clinics.length, dentists: dentists.length, patients: patients.length, slots: slots.length };
}

export { DEMO_PASSWORD };
