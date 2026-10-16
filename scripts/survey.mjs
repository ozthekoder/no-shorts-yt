// Surveys live YouTube in Playwright's Firefox and reports where Shorts appear,
// so selectors in shorts.css can be checked against YouTube's current markup.
// Usage: node scripts/survey.mjs [hl]   (hl = UI language, default "en")
import { firefox } from '@playwright/test';

const hl = process.argv[2] ?? 'en';
const PAGES = {
  home: 'https://www.youtube.com/',
  search: 'https://www.youtube.com/results?search_query=music',
  watch: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  channel: 'https://www.youtube.com/@MrBeast',
};

function inspect() {
  const isCustom = (el) => el.tagName.includes('-');
  const chainOf = (el) => {
    const chain = [];
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (isCustom(n)) chain.push(n.tagName.toLowerCase());
    }
    return chain.slice(0, 8).join(' < ');
  };
  const attrs = (el) =>
    Object.fromEntries([...el.attributes].map((a) => [a.name, a.value.slice(0, 80)]));

  const chains = {};
  for (const a of document.querySelectorAll('a[href^="/shorts/"]')) {
    const c = chainOf(a);
    chains[c] = (chains[c] ?? 0) + 1;
  }

  const shortsTags = [...new Set(
    [...document.querySelectorAll('*')]
      .map((e) => e.tagName.toLowerCase())
      .filter((t) => /reel|short/.test(t)),
  )];

  const guide = [...document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')]
    .filter((e) => /short/i.test(e.textContent) || e.querySelector('a[href*="shorts"]'))
    .map((e) => ({ tag: e.tagName.toLowerCase(), attrs: attrs(e), a: attrs(e.querySelector('a') ?? e), html: e.outerHTML.slice(0, 600) }));

  const tabs = [...document.querySelectorAll('yt-tab-shape, tp-yt-paper-tab, yt-tab-group-shape a')]
    .map((e) => ({ tag: e.tagName.toLowerCase(), attrs: attrs(e), text: e.textContent.trim().slice(0, 40) }));

  const chips = [...document.querySelectorAll('yt-chip-cloud-chip-renderer, chip-shape, yt-chip-view-model')]
    .map((e) => ({ tag: e.tagName.toLowerCase(), attrs: attrs(e), text: e.textContent.trim().slice(0, 40) }));

  const shelves = [...document.querySelectorAll('ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, grid-shelf-view-model, ytd-rich-section-renderer')]
    .map((e) => ({ tag: e.tagName.toLowerCase(), attrs: attrs(e), parent: e.parentElement?.tagName.toLowerCase(), hasShortsLink: !!e.querySelector('a[href^="/shorts/"]') }));

  return { title: document.title, shortsLinkChains: chains, shortsTags, guide, tabs, chips, shelves };
}

const browser = await firefox.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, locale: hl });
const report = {};
for (const [name, url] of Object.entries(PAGES)) {
  const sep = url.includes('?') ? '&' : '?';
  await page.goto(`${url}${sep}hl=${hl}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1500);
  }
  report[name] = await page.evaluate(inspect);
}
console.log(JSON.stringify(report, null, 2));
await browser.close();
