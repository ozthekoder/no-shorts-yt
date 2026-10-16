import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Loads a fixture with the extension's CSS and JS applied, as the content script would.
async function openFixture(page, surface) {
  await page.goto(pathToFileURL(path.join(root, 'test/fixtures', `${surface}.html`)).href);
  await page.addStyleTag({ path: path.join(root, 'shorts.css') });
  await page.addScriptTag({ path: path.join(root, 'shorts.js') });
}

// Each fixture marks elements data-test="short" (must be hidden) or
// data-test="regular" (must stay visible); data-name labels failures.
for (const surface of ['home', 'search', 'logged-in', 'nav', 'chips']) {
  test(`${surface}: Shorts hidden, regular content visible`, async ({ page }) => {
    await openFixture(page, surface);

    const shorts = await page.locator('[data-test="short"]').all();
    const regulars = await page.locator('[data-test="regular"]').all();
    expect(shorts.length, 'fixture has Shorts to hide').toBeGreaterThan(0);
    expect(regulars.length, 'fixture has regular content to keep').toBeGreaterThan(0);

    for (const el of shorts) {
      await expect.soft(el, `should hide: ${await el.getAttribute('data-name')}`).toBeHidden();
    }
    for (const el of regulars) {
      await expect.soft(el, `should keep: ${await el.getAttribute('data-name')}`).toBeVisible();
    }
  });
}

test('chips: a Shorts chip rendered after load is hidden', async ({ page }) => {
  await openFixture(page, 'chips');
  await page.evaluate(() => {
    const chip = document.createElement('yt-chip-cloud-chip-renderer');
    chip.id = 'late';
    chip.innerHTML = '<chip-shape><button>Shorts</button></chip-shape>';
    document.querySelector('#chips').append(chip);
  });
  await expect(page.locator('#late')).toBeHidden();
});

test('chips: a recycled chip reappears when its label is no longer Shorts', async ({ page }) => {
  await openFixture(page, 'chips');
  const chip = page.locator('[data-name="chip: Shorts (en)"]');
  await expect(chip).toBeHidden();
  await chip.evaluate((el) => { el.querySelector('button').textContent = 'Live'; });
  await expect(chip).toBeVisible();
});
