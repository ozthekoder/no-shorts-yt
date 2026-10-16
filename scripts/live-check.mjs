// Runs shorts.css + shorts.js against live YouTube in Playwright's Firefox and
// reports any Shorts still visible. Catches YouTube markup drift the fixtures can't.
// Usage: node scripts/live-check.mjs [locale]   (default "en-US"); exits 1 on leaks.
import { firefox } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const locale = process.argv[2] ?? 'en-US';
const css = await readFile(new URL('../shorts.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../shorts.js', import.meta.url), 'utf8');

// Mirrors the manifest's run_at: document_start injection.
function inject({ css, js }) {
  const style = document.createElement('style');
  style.textContent = css;
  document.documentElement.append(style);
  new Function(js)();
}

function leaks() {
  const visible = (el) => el.checkVisibility();
  const names = ['Shorts', 'YouTube Shorts', 'ショート'];
  return {
    shortsLinks: [...document.querySelectorAll('a[href^="/shorts/"]')].filter(visible).length,
    guideEntries: [...document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')]
      .filter((e) => names.includes(e.querySelector('a')?.getAttribute('title')) && visible(e)).length,
    tabs: [...document.querySelectorAll('yt-tab-shape')]
      .filter((t) => names.includes(t.getAttribute('tab-title')) && visible(t)).length,
    chips: [...document.querySelectorAll('yt-chip-cloud-chip-renderer')]
      .filter((c) => names.includes(c.textContent.trim()) && visible(c)).length,
    regularVideos: [...document.querySelectorAll('a[href^="/watch?v="]')].filter(visible).length,
  };
}

const browser = await firefox.launch();
let failed = false;
for (const width of [1400, 1000]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale });
  await context.addInitScript(inject, { css, js });
  const page = await context.newPage();

  // Watch history makes YouTube render the home feed for a logged-out session (not always).
  for (const id of ['dQw4w9WgXcQ', '9bZkp7q19f0', 'kJQP7kiw5Fk']) {
    await page.goto(`https://www.youtube.com/watch?v=${id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1500);
    }
  }

  for (const [name, url] of [
    ['home', 'https://www.youtube.com/'],
    ['search', 'https://www.youtube.com/results?search_query=music'], // "music" also gets the Shorts filter chip
    ['channel', 'https://www.youtube.com/@MrBeast'],
  ]) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(1200);
    }
    const r = await page.evaluate(leaks);
    // YouTube's "Try searching to get started" nudge means it served no feed to check.
    if (await page.locator('ytd-feed-nudge-renderer').count()) {
      console.log(`SKIP ${width}px ${name.padEnd(8)} YouTube served an empty feed (no watch history)`);
      continue;
    }
    const leaked = r.shortsLinks + r.guideEntries + r.tabs + r.chips;
    const ok = leaked === 0 && r.regularVideos > 0;
    failed ||= !ok;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${width}px ${name.padEnd(8)}`, JSON.stringify(r));
  }

  // Direct Shorts links are intentionally left alone: the player must still render.
  await page.goto('https://www.youtube.com/shorts/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const player = await page.evaluate(() => {
    const v = document.querySelector('ytd-shorts video, ytd-reel-video-renderer');
    return { url: location.pathname, playerVisible: !!v && v.checkVisibility() };
  });
  failed ||= !player.playerVisible;
  console.log(`${player.playerVisible ? 'PASS' : 'FAIL'} ${width}px shorts-player`, JSON.stringify(player));
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
