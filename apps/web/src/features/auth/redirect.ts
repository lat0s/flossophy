import type { Role } from '@flossophy/shared';
import type { LocationQuery } from 'vue-router';

/** Only same-app paths, so `?next=` can't send people to another site. */
export function nextPath(query: LocationQuery, role: Role) {
  const next = typeof query.next === 'string' ? query.next : '';
  if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) return next;
  return role === 'dentist' ? '/dentist' : '/clinics';
}
