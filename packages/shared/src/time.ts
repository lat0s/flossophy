import { CANCEL_CUTOFF_HOURS } from './slots.ts';

/** Clinics run on one wall clock, so the whole app shows times in this zone. */
export const CLINIC_TIME_ZONE = 'Europe/Stockholm';

export function canCancel(startsAt: Date | string, now = new Date()) {
  const start = typeof startsAt === 'string' ? Date.parse(startsAt) : startsAt.getTime();
  return start - now.getTime() >= CANCEL_CUTOFF_HOURS * 3_600_000;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Offset of `tz` from UTC at `at`, in ms. */
function tzOffset(at: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** Wall-clock `YYYY-MM-DD` + `HH:mm` in `tz` → UTC Date (DST-safe). */
export function zonedTime(date: string, hhmm: string, tz = CLINIC_TIME_ZONE) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffset(guess, tz);
  return new Date(guess - tzOffset(first, tz));
}

/** `YYYY-MM-DD` of `at` in `tz`. */
export function zonedDate(at: Date | number, tz = CLINIC_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(at);
}

/** Lower-case weekday key (mon…sun) of a `YYYY-MM-DD` date. */
export function weekdayOf(date: string) {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return keys[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
}

/** `YYYY-MM-DD` plus `n` days. */
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
