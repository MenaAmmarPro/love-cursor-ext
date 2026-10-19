# Love Cursor — `love-cursor-ext`

A trail of hearts or sparkles that follows your pointer, everywhere you go.
Toggle it on or off, pick hearts / sparkles / both, choose how thick and how
big the trail is, and switch it off on the sites you'd rather keep plain. It
also respects your system's **"reduce motion"** setting.

A small, warm gift for **Mena** — made with Manifest V3, no build step, no
network requests, no tracking.

## What it does

- **Trail** — a heart (or sparkle) drifts away from the pointer as you move.
- **Style** — hearts ♥, sparkles ✦, or a mix.
- **Density** — gentle, medium, or lots.
- **Size** — small, medium, or large.
- **Per-site off** — a list of hosts that stay plain; a host also covers its
  subdomains.
- **Reduced motion** — pauses itself when the OS asks for it (can be overridden).

Everything lives in `api.storage.sync` under the key `settings`:

```js
{
  enabled: true,
  type: "hearts",            // "hearts" | "sparkles" | "both"
  density: "medium",         // "low" | "medium" | "high"
  size: "medium",            // "small" | "medium" | "large"
  disabledSites: [],         // ["example.com", ...]
  respectReducedMotion: true
}
```

## Permissions

- `storage` only — to remember your settings.
- The content script matches `<all_urls>`, but it does nothing on a page until
  it reads your settings, and nothing at all on a site you've turned off.

## Layout

```
manifest.chrome.json      # MV3, background.service_worker
manifest.firefox.json     # MV3, background.scripts + gecko id
src/background.js         # seeds the defaults on install
src/content/cursor.js     # the trail (pure helpers + boot)
src/options/{options.html,options.css,options.js}
src/popup/{popup.html,popup.css,popup.js}
src/common/{api.js,data.js,theme.css}
icons/icon-{16,32,48,128}.png + icon.svg
tools/make-icons.js       # regenerates the icons (node tools/make-icons.js)
test/harness.js           # node test/harness.js
```

## Load unpacked / temporary add-on

**Chrome / Edge**

1. Copy the right manifest into place:
   `copy manifest.chrome.json manifest.json`
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick this folder.
5. Move the pointer around any page — the trail should appear.

**Firefox**

1. Copy the right manifest into place:
   `copy manifest.firefox.json manifest.json`
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick `manifest.json`.
4. Move the pointer around any page.

(Temporary add-ons clear when Firefox closes; re-load it the next time.)

## Tests

```sh
node --check src/content/cursor.js
node test/harness.js
```

The harness fakes the `api` and a tiny DOM, then checks the option defaults,
the per-site disable matching, the reduced-motion behaviour, and the trail
spawn/throttle/removal logic.

Made with love, just for you ♥
