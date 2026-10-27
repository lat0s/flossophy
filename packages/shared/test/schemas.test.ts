import { describe, expect, it } from 'vitest';
import { OpenSlotsInput, RegisterInput, addDays, canCancel, distanceKm, weekdayOf, zonedTime } from '../src/index.ts';

describe('RegisterInput', () => {
  it('lower-cases email and rejects unknown fields', () => {
    const ok = RegisterInput.parse({ name: 'Ada', email: 'ADA@Example.com', password: 'x'.repeat(10) });
    expect(ok.email).toBe('ada@example.com');
    const bad = RegisterInput.safeParse({ name: 'Ada', email: 'a@b.se', password: 'x'.repeat(10), role: 'dentist' });
    expect(bad.success).toBe(false);
  });
});

describe('OpenSlotsInput', () => {
  const base = {
    clinicId: 'a'.repeat(24),
    from: '2026-11-02',
    to: '2026-11-06',
    weekdays: ['mon'],
    start: '09:00',
    end: '12:00',
    minutes: 30,
  };
  it('accepts a normal week', () => expect(OpenSlotsInput.safeParse(base).success).toBe(true));
  it('rejects end before start', () => expect(OpenSlotsInput.safeParse({ ...base, end: '08:00' }).success).toBe(false));
  it('rejects odd lengths', () => expect(OpenSlotsInput.safeParse({ ...base, minutes: 25 }).success).toBe(false));
  it('rejects more than two months', () =>
    expect(OpenSlotsInput.safeParse({ ...base, to: '2027-02-01' }).success).toBe(false));
});

describe('helpers', () => {
  it('allows cancelling only 24h ahead', () => {
    const now = new Date('2026-11-01T10:00:00Z');
    expect(canCancel('2026-11-02T10:00:00Z', now)).toBe(true);
    expect(canCancel('2026-11-02T09:59:00Z', now)).toBe(false);
  });
  it('measures Gothenburg to Stockholm', () => {
    expect(Math.round(distanceKm({ lat: 57.7089, lng: 11.9746 }, { lat: 59.3293, lng: 18.0686 }))).toBe(397);
  });
});

describe('zoned time', () => {
  it('handles winter and summer time in Stockholm', () => {
    expect(zonedTime('2026-01-15', '09:00').toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(zonedTime('2026-07-15', '09:00').toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });
  it('knows weekdays and adds days across months', () => {
    expect(weekdayOf('2026-11-02')).toBe('mon');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});
