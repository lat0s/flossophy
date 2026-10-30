import { describe, expect, it } from 'vitest';
import { nextPath } from '@/features/auth/redirect';
import { initials, soonest, time } from '@/shared/format';

describe('format', () => {
  it('shows clinic-local times', () => {
    // 08:00 UTC in winter is 09:00 in Gothenburg.
    expect(time('2026-11-02T08:00:00Z')).toBe('09:00');
  });

  it('says today and tomorrow', () => {
    const now = new Date('2026-11-02T06:00:00Z');
    expect(soonest('2026-11-02T08:00:00Z', now)).toBe('Today 09:00');
    expect(soonest('2026-11-03T08:00:00Z', now)).toBe('Tomorrow 09:00');
  });

  it('makes initials without the title', () => {
    expect(initials('Dr. Sara Lind')).toBe('SL');
  });
});

describe('nextPath', () => {
  it('keeps same-app paths', () => {
    expect(nextPath({ next: '/clinics/floss-boss' }, 'patient')).toBe('/clinics/floss-boss');
  });

  it('refuses other sites', () => {
    expect(nextPath({ next: '//evil.example' }, 'patient')).toBe('/clinics');
    expect(nextPath({ next: 'https://evil.example' }, 'dentist')).toBe('/dentist');
    expect(nextPath({ next: '/\\evil.example' }, 'patient')).toBe('/clinics');
  });
});
