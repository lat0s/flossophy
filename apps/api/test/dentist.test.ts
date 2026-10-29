import { addDays, zonedDate } from '@flossophy/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Api, register, signIn, startApi } from './helpers.ts';

let api: Api;
beforeAll(async () => (api = await startApi()));
afterAll(() => api.stop());

describe('dentist portal', () => {
  it('shows the schedule with who booked', async () => {
    const sara = await signIn(api, 'dentist');
    const from = addDays(zonedDate(new Date()), -7);
    const { slots } = (await sara.get('/api/dentist/schedule').query({ from, days: 14 }).expect(200)).body;
    expect(slots.some((s: { patient: { name: string } | null }) => s.patient?.name === 'Alex Morgan')).toBe(true);
  });

  it('opens slots in bulk inside opening hours and skips clashes on a second run', async () => {
    const sara = await signIn(api, 'dentist');
    const { clinics } = (await sara.get('/api/dentist/clinics').expect(200)).body;
    const enamel = clinics.find((c: { slug: string }) => c.slug === 'enamel-and-co');
    const from = addDays(zonedDate(new Date()), 30);
    const body = {
      clinicId: enamel.id,
      from,
      to: addDays(from, 6),
      weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      start: '07:00',
      end: '10:00',
      minutes: 30,
    };
    const first = (await sara.post('/api/dentist/slots').send(body).expect(201)).body;
    // 08:00–10:00 on 5 weekdays (4 each) plus 10:00 is outside on Saturday's 10–15 hours → 20 created
    expect(first.created).toBe(20);
    expect(first.skipped).toBeGreaterThan(0);
    const again = (await sara.post('/api/dentist/slots').send(body).expect(201)).body;
    expect(again.created).toBe(0);
  });

  it("refuses clinics the dentist doesn't work at, and patients entirely", async () => {
    const sara = await signIn(api, 'dentist');
    const other = await api.db.Clinic.findOne({ slug: 'smile-harbour' }).lean();
    const from = addDays(zonedDate(new Date()), 30);
    const body = {
      clinicId: String(other!._id),
      from,
      to: from,
      weekdays: ['mon'],
      start: '10:00',
      end: '11:00',
      minutes: 30,
    };
    expect((await sara.post('/api/dentist/slots').send(body)).status).toBe(403);
    const patient = await register(api);
    expect((await patient.post('/api/dentist/slots').send(body)).status).toBe(403);
  });

  it('closes open slots but never booked ones', async () => {
    const sara = await signIn(api, 'dentist');
    const me = await api.db.User.findOne({ email: 'sara@flossophy.test' }).lean();
    const open = await api.db.Slot.findOne({ dentistId: me!._id, booking: null }).lean();
    const booked = await api.db.Slot.findOne({ dentistId: me!._id, booking: { $ne: null } }).lean();
    await sara.delete(`/api/dentist/slots/${open!._id}`).expect(204);
    expect((await sara.delete(`/api/dentist/slots/${booked!._id}`)).status).toBe(409);
  });
});
