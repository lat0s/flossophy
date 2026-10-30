import type { AppointmentList, ClinicDetail, ClinicList, OutboxEmail, PublicSlot, Schedule } from '@flossophy/shared';
import { useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { api } from './client';

export const keys = {
  clinics: (q: string, near: string) => ['clinics', q, near] as const,
  clinic: (slug: string) => ['clinic', slug] as const,
  slots: (clinicId: string, from: string) => ['slots', clinicId, from] as const,
  appointments: ['appointments'] as const,
  schedule: (from: string) => ['schedule', from] as const,
  dentistClinics: ['dentist-clinics'] as const,
  outbox: ['outbox'] as const,
};

export function useClinics(q: MaybeRefOrGetter<string>, near: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.clinics(toValue(q), toValue(near))),
    queryFn: ({ signal }) =>
      api<ClinicList>('/clinics', { query: { q: toValue(q) || undefined, near: toValue(near) || undefined }, signal }),
    placeholderData: (prev) => prev,
  });
}

export function useClinic(slug: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.clinic(toValue(slug))),
    queryFn: ({ signal }) => api<ClinicDetail>(`/clinics/${toValue(slug)}`, { signal }),
  });
}

/** Refreshes every 15 s so times others book disappear without a reload. */
export function useSlots(clinicId: MaybeRefOrGetter<string | undefined>, from: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.slots(toValue(clinicId) ?? '', toValue(from))),
    queryFn: ({ signal }) =>
      api<{ slots: PublicSlot[] }>(`/clinics/${toValue(clinicId)}/slots`, {
        query: { from: toValue(from), days: 7 },
        signal,
      }),
    enabled: computed(() => !!toValue(clinicId)),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: keys.appointments,
    queryFn: ({ signal }) => api<AppointmentList>('/me/appointments', { signal }),
  });
}

export function useSchedule(from: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.schedule(toValue(from))),
    queryFn: ({ signal }) => api<Schedule>('/dentist/schedule', { query: { from: toValue(from), days: 7 }, signal }),
    refetchInterval: 20_000,
    placeholderData: (prev) => prev,
  });
}

export function useDentistClinics() {
  return useQuery({
    queryKey: keys.dentistClinics,
    queryFn: ({ signal }) =>
      api<{ clinics: { id: string; name: string; slug: string }[] }>('/dentist/clinics', { signal }),
  });
}

export function useOutbox(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: keys.outbox,
    queryFn: ({ signal }) => api<{ emails: OutboxEmail[] }>('/outbox', { signal }),
    enabled: computed(() => toValue(enabled)),
    refetchInterval: 10_000,
  });
}
