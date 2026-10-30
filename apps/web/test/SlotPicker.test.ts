import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SlotPicker from '@/features/clinics/SlotPicker.vue';

const slot = (id: string, startsAt: string, taken = false) => ({ id, dentistId: 'd1', startsAt, minutes: 30, taken });

describe('SlotPicker', () => {
  it('lets you pick open times only', async () => {
    const w = mount(SlotPicker, {
      props: {
        from: '2030-01-07',
        slots: [slot('a', '2030-01-07T08:00:00Z'), slot('b', '2030-01-07T09:00:00Z', true)],
      },
    });
    expect(w.text()).toContain('1 open time this week');
    const buttons = w.findAll('button[aria-label^="Book"]');
    // One open time, rendered in both the phone and desktop layouts.
    expect(buttons).toHaveLength(2);
    await buttons[0]!.trigger('click');
    expect(w.emitted('pick')?.[0]?.[0]).toMatchObject({ id: 'a' });
  });
});
