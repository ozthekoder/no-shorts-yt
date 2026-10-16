// No Shorts: tags the search "Shorts" filter chip so shorts.css can hide it.
// The chip has no attribute or link that identifies it, only its label, so CSS
// alone can't match it.

// Labels observed 2026-10-16: most languages keep "Shorts"; ja and uk differ.
const SHORTS_LABELS = new Set(['Shorts', 'ショート', 'YouTube Shorts']);

let queued = false;

// Re-evaluates every chip, so a chip YouTube recycles for another label is un-tagged.
function tagChips() {
  queued = false;
  for (const chip of document.querySelectorAll('yt-chip-cloud-chip-renderer')) {
    chip.toggleAttribute('data-no-shorts', SHORTS_LABELS.has(chip.textContent.trim()));
  }
}

// The chip bar is created lazily and rebuilt on in-app navigation, so watch the
// whole document but run at most one pass per frame.
function queueTagChips() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(tagChips);
}

new MutationObserver(queueTagChips).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});
queueTagChips();
