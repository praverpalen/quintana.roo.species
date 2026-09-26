import { expect, test } from '@playwright/test';

const shot = (name: string) => ({ path: `test-results/shots/${name}.png` });

test('spot a species end to end', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What will you spot today?' })).toBeVisible();
  await expect(page.locator('.hero-big')).toHaveText('0');
  await page.screenshot(shot('1-home-empty'));

  // Category row opens Cards filtered to that category.
  await page.getByRole('button', { name: /Mammals/ }).click();
  await expect(page.getByRole('heading', { name: 'All cards' })).toBeVisible();
  await expect(page.getByText('4 species')).toBeVisible();

  // Open a locked card, spot it.
  await page.getByRole('button', { name: /^Jaguar, #/ }).click();
  const detail = page.getByRole('dialog', { name: 'Jaguar' });
  await expect(detail).toHaveClass(/open/);
  await page.waitForTimeout(450);
  await page.screenshot(shot('2-detail-locked'));
  await detail.getByRole('button', { name: 'I spotted it!' }).click();
  await expect(page.getByRole('status')).toHaveText('Card unlocked!');
  await expect(detail.getByText(/Spotted on/)).toBeVisible();
  await page.screenshot(shot('3-detail-spotted'));

  // Browser back closes the sheet.
  await page.goBack();
  await expect(page.locator('.detail')).not.toHaveClass(/open/);

  // Persisted across reload; shows up in Collection and Home.
  await page.reload();
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await expect(page.getByText('1 of 29 spotted')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Jaguar, #/ })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.hero-big')).toHaveText('1');
  await expect(page.getByRole('heading', { name: 'Recently spotted' })).toBeVisible();
});

test('search, filters and language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('qroo-explorer-v1', JSON.stringify({ lang: 'en', spotted: { ceiba: '2026-07-05', lionfish: '2026-08-03', coati: '2026-07-19', jaguar: '2026-09-18', turtle: '2026-08-24', zebra: '2026-09-06' } })));
  await page.goto('/');
  await page.screenshot(shot('4-home-seeded'));
  await page.locator('.fake-search').click();
  const search = page.getByRole('searchbox', { name: 'Search a species…' });
  await expect(search).toBeFocused();
  await search.fill('tucan');
  await expect(page.getByText('1 species')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText('29 species')).toBeVisible();
  await page.screenshot(shot('5-cards'));

  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Introduced' }).click();
  await page.getByRole('button', { name: 'Red', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Filters · 2' })).toBeVisible();
  await expect(page.getByText('2 species')).toBeVisible();
  await page.screenshot(shot('6-filters'));
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByText('29 species')).toBeVisible();

  await page.getByRole('button', { name: 'To find' }).click();
  await expect(page.getByText('23 species')).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué descubrirás hoy?' })).toBeVisible();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await expect(page.getByText('6 de 29 avistadas')).toBeVisible();
  await page.screenshot(shot('7-collection-es'));
});
