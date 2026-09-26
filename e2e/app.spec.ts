import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Expected counts come from the published catalog, so the tests survive data updates.
const species: { id: string; cat: string; en: string; es: string; nat: number; col: string[] }[] = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')).species;
const total = species.length;
const count = (f: (s: (typeof species)[number]) => boolean) => species.filter(f).length;

const shot = (name: string) => ({ path: `test-results/shots/${name}.png` });

test('spot a species end to end', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What will you spot today?' })).toBeVisible();
  await expect(page.locator('.hero-big')).toHaveText('0');
  await page.screenshot(shot('1-home-empty'));

  // Category row opens Cards filtered to that category.
  await page.getByRole('button', { name: /Mammals/ }).click();
  await expect(page.getByRole('heading', { name: 'All cards' })).toBeVisible();
  await expect(page.getByText(`${count((s) => s.cat === 'mammal')} species`, { exact: true })).toBeVisible();

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
  await expect(page.getByText(`1 of ${total} spotted`)).toBeVisible();
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
  await search.fill('pajaro reloj');
  await expect(page.getByRole('button', { name: /^Turquoise-browed motmot, #/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByText(`${total} species`, { exact: true })).toBeVisible();
  await page.screenshot(shot('5-cards'));

  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Introduced' }).click();
  await page.getByRole('button', { name: 'Red', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Filters · 2' })).toBeVisible();
  await expect(page.getByText(`${count((s) => !s.nat && s.col.includes('red'))} species`, { exact: true })).toBeVisible();
  await page.screenshot(shot('6-filters'));
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByText(`${total} species`, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'To find' }).click();
  await expect(page.getByText(`${total - 6} species`, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué descubrirás hoy?' })).toBeVisible();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await expect(page.getByText(`6 de ${total} avistadas`)).toBeVisible();
  await page.screenshot(shot('7-collection-es'));
});

test('photos: greyed on locked cards, large on the species page, and your own', async ({ page }) => {
  // Serve a stand-in for every iNaturalist photo (the test runner may be offline).
  const fake = await (async () => {
    await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div style="width:360px;height:240px;background:radial-gradient(circle at 60% 45%,#f6a06b 0 22%,#7a8a5e 23% 60%,#3d472b 61%)"></div>');
    return page.screenshot({ clip: { x: 0, y: 0, width: 360, height: 240 } });
  })();
  await page.route(/inaturalist-open-data|static\.inaturalist/, (r) => r.fulfill({ body: fake, contentType: 'image/png' }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.getByRole('searchbox').fill('great kiskadee');
  const card = page.getByRole('button', { name: /^Great Kiskadee, #/ });
  await expect(card.locator('img.sc-art-grey')).toBeVisible();
  await card.click();
  const bigPhoto = page.locator('.detail.open .d-photo img');
  await expect(bigPhoto).toBeVisible();
  await expect(bigPhoto).toHaveAttribute('src', /\/large\./);
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'test-results/shots/8-detail-photo.png' });

  // Add your own photo: it unlocks the card and appears in "My photos".
  await page.locator('.detail.open input[type=file]').setInputFiles({ name: 'mine.png', mimeType: 'image/png', buffer: fake });
  await expect(page.getByRole('status')).toHaveText('Card unlocked!');
  await expect(page.locator('.detail.open .mine-grid img')).toHaveCount(1);
  await page.locator('.detail.open .mine-grid button').first().click();
  await expect(page.locator('.lightbox img')).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/9-lightbox.png' });
  await page.keyboard.press('Escape');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.detail.open .mine-grid img')).toHaveCount(0);

  // Photo survives a reload (IndexedDB) — add again, reload, check.
  await page.locator('.detail.open input[type=file]').setInputFiles({ name: 'mine.png', mimeType: 'image/png', buffer: fake });
  await expect(page.locator('.detail.open .mine-grid img')).toHaveCount(1);
  await page.goBack();
  await page.reload();
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Great Kiskadee, #/ }).locator('img')).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/10-collection-own-photo.png' });
});
