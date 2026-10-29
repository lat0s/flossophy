import { CLINIC_TIME_ZONE } from '@flossophy/shared';

const tz = CLINIC_TIME_ZONE;
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...o });

export const time = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const dayLong = (iso: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
export const dayShort = (date: string) => fmt({ weekday: 'short' }).format(new Date(`${date}T12:00:00Z`));
export const dayNum = (date: string) => fmt({ day: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
export const monthYear = (date: string) =>
  fmt({ month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
export const dateTime = (iso: string) => `${dayLong(iso)}, ${time(iso)}`;

/** "in 3 days", "in 2 hours", "yesterday". */
export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const h = diff / 3_600_000;
  if (Math.abs(h) < 1) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (Math.abs(h) < 24) return rtf.format(Math.round(h), 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}

/** "Today 09:30", "Tomorrow 14:00", "Thu 6 Nov 10:15". */
export function soonest(iso: string, now = new Date()) {
  const day = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
  const d = day.format(new Date(iso));
  if (d === day.format(now)) return `Today ${time(iso)}`;
  if (d === day.format(new Date(now.getTime() + 86_400_000))) return `Tomorrow ${time(iso)}`;
  return `${fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))} ${time(iso)}`;
}

export const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
