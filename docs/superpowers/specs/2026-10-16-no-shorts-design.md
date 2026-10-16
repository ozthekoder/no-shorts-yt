# No Shorts: a Zen/Firefox extension that hides YouTube Shorts

## Context

`~/Projects/no-shorts-on-zen` is empty (not yet a git repo). The user wants Shorts gone from YouTube in Zen (a Firefox fork, v1.21.16b, binary at `/Applications/Zen.app/Contents/MacOS/zen`). Node 24, npm 11, and git are installed. `web-ext` is not installed yet.

**Decisions made with the user:**
- **Audience:** a permanent personal install (AMO *unlisted* signing) **and** a public AMO listing, using the same add-on ID on both channels.
- **Direct `/shorts/<id>` URLs:** leave them alone. Scope is *discovery surfaces only*: no redirects and no blocking.
- **UI:** none. Always on, and users disable it from `about:addons`.
- **Approach:** CSS-only with `:has()` selectors. Add a small JS fallback **only if** the live DOM survey finds a surface that CSS can't match in a language-independent way.

**Success criteria:** On home, subscriptions, search, watch-page sidebar, channel pages, and the left nav (both expanded and mini), no Shorts shelves, cards, or entries are visible. Shorts never flash on load. Regular videos are untouched. `web-ext lint` reports 0 errors. The signed XPI installs permanently in Zen, and AMO accepts the listed submission.

## Design

### File layout
```
manifest.json
shorts.css                 # all hiding rules
icons/icon.svg
test/fixtures/*.html       # trimmed real YouTube DOM, one per surface
test/shorts.spec.js        # Playwright (Firefox/Gecko engine) test
package.json               # devDeps: web-ext, @playwright/test; scripts: lint, test, start, sign
README.md, LICENSE (MIT), .gitignore (node_modules, web-ext-artifacts)
docs/superpowers/specs/2026-10-16-no-shorts-design.md   # copy of this design
```

### manifest.json (MV3)
```json
{
  "manifest_version": 3,
  "name": "No Shorts",
  "version": "1.0.0",
  "description": "Hides YouTube Shorts from feeds, search, sidebars and navigation.",
  "icons": { "48": "icons/icon.svg", "96": "icons/icon.svg" },
  "content_scripts": [{
    "matches": ["*://www.youtube.com/*"],
    "css": ["shorts.css"],
    "run_at": "document_start"
  }],
  "browser_specific_settings": {
    "gecko": {
      "id": "no-shorts@oozdemir2704",
      "strict_min_version": "140.0",
      "data_collection_permissions": { "required": ["none"] }
    }
  }
}
```
- `data_collection_permissions` is **mandatory** for new AMO submissions (since 2025-11-03). Without it, signing is rejected.
- `strict_min_version: 140.0` covers `:has()` (Firefox 121+) and avoids the extra consent requirements that apply to Firefox versions below 140.
- The gecko `id` is permanent once signed, so confirm it before the first `web-ext sign`. The AMO name must be unique; if "No Shorts" is taken, pick another name at submission time.
- No `permissions` array. The content-script match on `www.youtube.com` is the whole footprint.

### shorts.css: three selector groups
Every rule is `display: none !important`. The candidates below come from what I already know of YouTube's DOM and **must be confirmed in step 2**, because YouTube's markup changes often.

1. **Shelves:** `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])` (home), `ytd-reel-shelf-renderer` (search, watch sidebar, channel home), `grid-shelf-view-model:has(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2)` (newer search shelf).
2. **Individual cards** (keyed on the URL path, so they work in every language): `ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-grid-video-renderer`, `yt-lockup-view-model`, `ytd-notification-renderer`, each with `:has(a[href^="/shorts/"])`.
3. **Navigation:** the sidebar `ytd-guide-entry-renderer`, the mini-guide `ytd-mini-guide-entry-renderer`, the channel tab `yt-tab-shape`, and the search filter chip. **This is the risk area for translated labels**: prefer a structural hook found in step 2. If only translated text exists, use the JS fallback below.
   - **User contribution point:** the user writes this group (about 5–10 lines) using the step 2 findings, since the choice between structural and text matching is a judgment call.

### Conditional JS fallback (only if step 2 requires it)
`shorts.js` content script that **tags** nav items with `data-no-shorts`. `shorts.css` then hides `[data-no-shorts]`, which keeps all the hiding in CSS. It re-checks on YouTube's `yt-navigate-finish` event plus one `MutationObserver` scoped to the nav containers only, never `document`. Identify items structurally: in Firefox, use `el.wrappedJSObject.data` to read Polymer's endpoint data, which isn't visible from the isolated world otherwise.

## Implementation steps

0. `git init`, add `.gitignore`, save this design to `docs/superpowers/specs/…`, then commit.
1. **Scaffold:** `package.json`, `manifest.json`, `icons/icon.svg`, an empty `shorts.css`. Run `npm i -D web-ext @playwright/test` and `npx playwright install firefox`. `npx web-ext lint` must be green.
2. **Live DOM survey:** use Playwright MCP to open www.youtube.com and inspect home, search (e.g. "music"), a watch page, a channel with a Shorts tab, and the sidebar both expanded and mini. Also load with `?hl=de` to see which attributes are translated. Record confirmed selectors, and save trimmed fixtures in which each Short is marked `data-test="short"` and each regular item `data-test="regular"`.
3. **Failing test first:** `test/shorts.spec.js` loads each fixture in Firefox, injects `shorts.css` via `page.addStyleTag`, and asserts every `[data-test=short]` is hidden and every `[data-test=regular]` is visible. Run it and watch it fail.
4. **Write `shorts.css`** groups 1–2 (me) and group 3 (user contribution). Tests go green.
5. **JS fallback:** only if step 2 showed it's needed. Add it to the manifest and extend the tests.
6. **Manual check in Zen:** run `npx web-ext run --firefox=/Applications/Zen.app/Contents/MacOS/zen --start-url https://www.youtube.com` (temporary profile, so no login). Check **Subscriptions** in the user's real profile through `about:debugging` → *Load Temporary Add-on*. Scroll deep into the home feed to confirm infinite-scroll items stay hidden, and confirm a direct `/shorts/<id>` link still plays.
7. **Signing and listing.** These are outward-facing actions: confirm with the user before each one.
   - The user creates AMO API keys at addons.mozilla.org/developers/addon/api/key/ and exports `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET`. Never write them to the repo.
   - Personal: `npx web-ext sign --channel=unlisted` produces `web-ext-artifacts/*.xpi`. Install in Zen via `about:addons` → gear → *Install Add-on From File*.
   - Public: the first listed submission goes through the AMO Developer Hub (summary, category, MIT license, a "collects no data" privacy note). Later versions use `web-ext sign --channel=listed`. **Every upload on either channel needs a new version number.** Once the listing is live, switch the personal install to the AMO one so updates arrive automatically.

## Verification
- `npm test`: Playwright Firefox fixture tests pass (Shorts hidden, regular videos visible).
- `npx web-ext lint`: 0 errors.
- Manual pass in Zen across all surfaces from the success criteria, including a deep scroll and a direct `/shorts/` link.
- Signed XPI installs and survives a Zen restart.

## Known limitations (to document in README)
- When YouTube changes its markup, selectors will need updates. The fixtures make regressions visible, but they can't detect drift on the live site by themselves.
- `m.youtube.com`, YouTube Music, and Studio are out of scope for v1.
