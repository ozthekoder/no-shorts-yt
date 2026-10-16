# No Shorts

A Zen/Firefox extension that hides YouTube Shorts from feeds, search, sidebars and navigation.
Direct `/shorts/<id>` links still open normally; only places that surface Shorts are cleaned up.
No settings, no data collection. Turn it off from `about:addons`.

## What gets hidden

| Surface | How |
|---|---|
| Home / subscriptions Shorts shelf | CSS: `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])` |
| Search Shorts shelf | CSS: `grid-shelf-view-model:has(ytm-shorts-lockup-view-model)` |
| Individual Short cards (grid, list, related, notifications) | CSS: `:has(a[href^="/shorts/"])` |
| Sidebar, mini sidebar, channel "Shorts" tab | CSS: icon path, href, and exact label |
| Search "Shorts" filter chip | `shorts.js` tags it by label, CSS hides it |

The CSS is injected at `document_start`, so Shorts never flash on screen.

## Development

```sh
npm install
npx playwright install firefox
npm test          # Playwright (Gecko) fixture tests
npm run lint      # web-ext lint
npm start         # launches Zen with the extension in a temporary profile
npm run check:live  # runs the rules against live YouTube; exits 1 if any Shorts stay visible
npm run survey    # reports where Shorts appear on live YouTube (pass a locale, e.g. `ja`)
```

`check:live` uses a logged-out session, so YouTube sometimes serves an empty home feed. That
page is reported as `SKIP`, not `PASS`.

To test in your own profile (for example, to check Subscriptions while logged in): open
`about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → choose `manifest.json`.

### When YouTube changes its markup

1. `npm run check:live` shows which page leaks; `npm run survey` (and e.g. `npm run survey -- ja`)
   shows the current structure.
2. Update the matching fixture in `test/fixtures/`, then run `npm test` and watch it fail.
3. Fix `shorts.css` until it passes.

## Signing and publishing

Needs AMO API credentials from https://addons.mozilla.org/developers/addon/api/key/ (Developer Hub → Tools → Manage API Keys),
exported as `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` (never commit them).

- Personal install: `npm run sign:unlisted` creates a signed `.xpi` in `web-ext-artifacts/`.
  Install it in Zen via `about:addons` → gear → *Install Add-on From File*.
- Public listing: submit the first version through the AMO Developer Hub; later versions with
  `npm run sign:listed`. Every upload, on either channel, needs a new `version` in `manifest.json`.

## Known limitations

- YouTube changes its markup often. The fixture tests catch regressions in the rules, but they
  can't notice drift on the live site. Use `npm run check:live` for that.
- Sidebar, tab and chip labels are matched for "Shorts", "YouTube Shorts" and "ショート", which covers
  the 16 languages surveyed. The sidebar entry also matches by icon, so it works in any language.
- `m.youtube.com`, YouTube Music and YouTube Studio are out of scope.
