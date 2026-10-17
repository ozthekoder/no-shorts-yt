// Shared helpers for scripts that drive live YouTube with the extension's rules applied.
import { readFile } from 'node:fs/promises';

export async function loadExtension() {
  const [css, js] = await Promise.all(
    ['shorts.css', 'shorts.js'].map((f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8')),
  );
  return { css, js };
}

// Runs in the page via context.addInitScript; mirrors the manifest's run_at: document_start.
export function inject({ css, js }) {
  const style = document.createElement('style');
  style.textContent = css;
  document.documentElement.append(style);
  new Function(js)();
}

// Watch history makes YouTube render the home feed for a logged-out session (not always).
export async function seedWatchHistory(page) {
  for (const id of ['dQw4w9WgXcQ', '9bZkp7q19f0', 'kJQP7kiw5Fk']) {
    await page.goto(`https://www.youtube.com/watch?v=${id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1500);
    }
  }
}

// YouTube's "Try searching to get started" nudge means it served no home feed.
export async function isEmptyFeed(page) {
  return (await page.locator('ytd-feed-nudge-renderer').count()) > 0;
}
