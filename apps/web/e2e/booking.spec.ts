import { expect, test } from '@playwright/test';

test('a patient books a visit and cancels it', async ({ page }) => {
  await page.goto('/login?next=/clinics');
  await page.getByRole('button', { name: /^Alex/ }).click();
  await expect(page).toHaveURL(/\/clinics$/);

  await page
    .getByRole('link', { name: /Floss Boss/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Floss Boss Dental' })).toBeVisible();

  // Next week, so the visit is far enough away to cancel; the last time there never clashes with a seeded visit.
  await page.getByRole('button', { name: 'Next week' }).click();
  const slots = page.locator('button[aria-label^="Book "]:visible');
  await expect(slots.first()).toBeVisible();
  const slot = slots.last();
  const label = (await slot.getAttribute('aria-label'))!;
  await slot.click();
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page.getByRole('heading', { name: 'You are booked in!' })).toBeVisible();

  // Wait for fresh visits, not the cached list from before the booking.
  const fresh = page.waitForResponse((r) => r.url().endsWith('/api/me/appointments') && r.ok());
  await page.getByRole('link', { name: 'See my visits' }).click();
  await fresh;
  await expect(page).toHaveURL(/\/visits$/);
  const time = label.match(/\d{2}:\d{2}/)![0];
  const cancellable = page
    .locator('article', { hasText: time })
    .filter({ has: page.getByRole('button', { name: 'Cancel' }) });
  await expect(cancellable.first()).toBeVisible();
  const before = await cancellable.count();
  await cancellable.first().getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Yes, cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(cancellable).toHaveCount(before - 1);
});

test('signed-out visitors are sent to sign in for their visits', async ({ page }) => {
  await page.goto('/visits');
  await expect(page).toHaveURL(/\/login\?next=\/visits$/);
});
