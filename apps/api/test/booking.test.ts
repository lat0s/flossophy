import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Api, openSlot, register, signIn, startApi } from './helpers.ts';

let api: Api;
beforeAll(async () => (api = await startApi()));
afterAll(() => api.stop());

describe('clinics', () => {
  it('lists seeded clinics and sorts by distance', async () => {
    const res = await api.http().get('/api/clinics').query({ near: '57.7071,11.9386' }).expect(200);
    expect(res.body.clinics).toHaveLength(8);
    expect(res.body.clinics[0].slug).toBe('smile-harbour');
    expect(res.body.clinics[0].distanceKm).toBe(0);
  });

  it('searches by area or tag', async () => {
    const res = await api.http().get('/api/clinics').query({ q: 'haga' }).expect(200);
    expect(res.body.clinics.map((c: { slug: string }) => c.slug)).toEqual(['floss-boss']);
  });

  it('shows a clinic with its dentists and public slots without patient details', async () => {
    const clinic = (await api.http().get('/api/clinics/brush-and-bloom').expect(200)).body;
    expect(clinic.dentists.map((d: { name: string }) => d.name)).toContain('Dr. Sara Lind');
    const today = new Date().toISOString().slice(0, 10);
    const slots = (await api.http().get(`/api/clinics/${clinic.id}/slots`).query({ from: today, days: 14 }).expect(200))
      .body.slots;
    expect(slots.length).toBeGreaterThan(10);
    expect(Object.keys(slots[0]).sort()).toEqual(['dentistId', 'id', 'minutes', 'startsAt', 'taken']);
  });
});

describe('booking', () => {
  it('books an open slot, emails both sides, and shows it in my appointments', async () => {
    const a = await register(api, 'Booker One', 'booker1@example.com');
    const slot = await openSlot(api);
    const res = await a.post(`/api/slots/${slot._id}/book`).send({ reason: 'Check-up' });
    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({ id: String(slot._id), reason: 'Check-up', canCancel: true });
    const mine = (await a.get('/api/me/appointments').expect(200)).body;
    expect(mine.upcoming.map((x: { id: string }) => x.id)).toContain(String(slot._id));
    const emails = await api.db.Email.find({ kind: 'booked' }).lean();
    expect(emails.map((e) => e.to)).toEqual(expect.arrayContaining(['booker1@example.com']));
    expect(emails).toHaveLength(2);
  });

  it('lets exactly one of many racing patients win a slot', async () => {
    const slot = await openSlot(api);
    const agents = await Promise.all([1, 2, 3, 4, 5].map((i) => register(api, `Racer ${i}`, `racer${i}@example.com`)));
    const results = await Promise.all(agents.map((a) => a.post(`/api/slots/${slot._id}/book`).send({})));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(results.find((r) => r.status === 409)?.body.error.message).toMatch(/just booked/);
  });

  it('needs a signed-in patient', async () => {
    const slot = await openSlot(api);
    expect((await api.http().post(`/api/slots/${slot._id}/book`).send({})).status).toBe(401);
    const dentist = await signIn(api, 'dentist');
    expect((await dentist.post(`/api/slots/${slot._id}/book`).send({})).status).toBe(403);
  });

  it('stops double-booking yourself around the same time', async () => {
    const a = await register(api);
    const first = await openSlot(api, 96);
    await a.post(`/api/slots/${first._id}/book`).send({}).expect(201);
    const near = await api.db.Slot.findOne({
      booking: null,
      dentistId: { $ne: first.dentistId },
      startsAt: first.startsAt,
    }).lean();
    if (near) expect((await a.post(`/api/slots/${near._id}/book`).send({})).status).toBe(409);
  });
});

describe('cancelling', () => {
  it('cancels more than 24h ahead and reopens the slot', async () => {
    const alex = await signIn(api, 'patient');
    const { upcoming } = (await alex.get('/api/me/appointments').expect(200)).body;
    const later = upcoming.find((x: { canCancel: boolean }) => x.canCancel);
    await alex.delete(`/api/me/appointments/${later.id}`).expect(204);
    const slot = await api.db.Slot.findById(later.id).lean();
    expect(slot?.booking).toBeNull();
    expect(await api.db.Email.countDocuments({ kind: 'cancelled' })).toBe(2);
  });

  it('refuses inside 24h', async () => {
    const alex = await signIn(api, 'patient');
    const { upcoming } = (await alex.get('/api/me/appointments').expect(200)).body;
    const soon = upcoming.find((x: { canCancel: boolean }) => !x.canCancel);
    if (!soon) return; // seed found no slot in the next 24h (e.g. weekend)
    const res = await alex.delete(`/api/me/appointments/${soon.id}`);
    expect(res.status).toBe(409);
  });

  it("can't touch someone else's appointment", async () => {
    const alex = await signIn(api, 'patient');
    const { upcoming } = (await alex.get('/api/me/appointments').expect(200)).body;
    const stranger = await register(api);
    for (const a of upcoming) expect((await stranger.delete(`/api/me/appointments/${a.id}`)).status).toBe(404);
  });
});
