// Captures before/after screenshots of live YouTube for the AMO listing (1280x800,
// AMO's recommended size). Review every image before uploading: feeds and ads rotate.
// Usage: node scripts/screenshots.mjs [outDir]   (default store/screenshots)
import { firefox } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { inject, loadExtension } from './youtube.mjs';

const outDir = process.argv[2] ?? 'store/screenshots';
const VIEWPORT = { width: 1280, height: 800 };
// The home feed is left out: it is random per session and can surface content
// that shouldn't appear in a public listing.
const SHOTS = [
  // Shows the Shorts shelf, the Shorts filter chip and the sidebar entry.
  { name: '1-search', url: 'https://www.youtube.com/results?search_query=music' },
  // Shows the channel's Shorts tab.
  { name: '2-channel', url: 'https://www.youtube.com/@MrBeast' },
];
const MODES = {
  before: { text: 'Without No Shorts', color: '#5f6368' },
  after: { text: 'With No Shorts', color: '#188038' },
};

function addBadge({ text, color }) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;bottom:24px;right:24px;z-index:2147483647;padding:12px 20px;' +
    'border-radius:999px;font:600 18px/1 system-ui,sans-serif;color:#fff;' +
    `background:${color};box-shadow:0 2px 10px rgba(0,0,0,.35)`;
  document.body.append(el);
}

await mkdir(outDir, { recursive: true });
const extension = await loadExtension();
const browser = await firefox.launch();
for (const [mode, badge] of Object.entries(MODES)) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'en-US' });
  if (mode === 'after') await context.addInitScript(inject, extension);
  const page = await context.newPage();
  for (const shot of SHOTS) {
    await page.goto(shot.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000); // let lazy thumbnails load
    await page.evaluate(addBadge, badge);
    const file = path.join(outDir, `${shot.name}-${mode}.png`);
    await page.screenshot({ path: file });
    console.log(`saved ${file}`);
  }
  await context.close();
}
await browser.close();
