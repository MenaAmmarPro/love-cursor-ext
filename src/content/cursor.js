"use strict";

/* love-cursor-ext — the heart / sparkle cursor trail.
 *
 * Pure helpers (shouldTrail, createEngine) sit on globalThis.LoveCursor so the
 * Node harness can drive them; boot() wires them to the real page.
 * Respects `prefers-reduced-motion` and the per-site disable list.
 */

(function () {
  var D = globalThis.LoveCursorData;

  var TRAIL_MS = 900;

  var STYLES =
    ".mena-cursor-node{position:fixed;pointer-events:none;z-index:2147483647;" +
    "left:0;top:0;transform:translate(-50%,-50%);line-height:1;" +
    "animation:mena-cursor-fade " + TRAIL_MS + "ms ease-out forwards;will-change:transform,opacity;}" +
    "@keyframes mena-cursor-fade{" +
    "0%{opacity:.95;transform:translate(-50%,-50%) scale(.55) translate(0,0);}" +
    "100%{opacity:0;transform:translate(-50%,-50%) scale(1.15) translate(var(--mena-dx,0),var(--mena-dy,0));}}" +
    ".mena-cursor-hearts{color:#ff4f9a;text-shadow:0 0 6px rgba(255,79,154,.6);}" +
    ".mena-cursor-sparkles{color:#ffd27f;text-shadow:0 0 8px rgba(255,210,127,.8);}" +
    ".mena-cursor-both{color:#ff8fbf;text-shadow:0 0 7px rgba(255,143,191,.7);}" +
    "@media (prefers-reduced-motion: reduce){.mena-cursor-node{animation:none;opacity:0;}}";

  /* Should the trail run on this page right now? */
  function shouldTrail(settings, hostname, reducedMotion) {
    if (!settings || !settings.enabled) return false;
    if (D.isHostDisabled(settings.disabledSites || [], hostname)) return false;
    if (reducedMotion && settings.respectReducedMotion) return false;
    return true;
  }

  /* Build a trail engine against an injected document-like object.
   * `opts.now` and `opts.schedule` make it deterministic for tests. */
  function createEngine(doc, settings, opts) {
    opts = opts || {};
    var now = opts.now || function () { return Date.now(); };
    var schedule = opts.schedule || function (fn, ms) { return setTimeout(fn, ms); };
    var gap = D.densityGap(settings.density);
    var px = D.sizePx(settings.size);
    var last = -Infinity;
    var count = 0;

    function makeNode(x, y) {
      var node = doc.createElement("span");
      node.className = "mena-cursor-node mena-cursor-" + settings.type;
      node.textContent = D.glyphFor(settings.type);
      node.style.fontSize = px + "px";
      node.style.left = x + "px";
      node.style.top = y + "px";
      if (typeof node.style.setProperty === "function") {
        node.style.setProperty("--mena-dx", Math.round(Math.random() * 26 - 13) + "px");
        node.style.setProperty("--mena-dy", Math.round(Math.random() * 26 - 13) + "px");
      }
      return node;
    }

    function removeNode(node) {
      if (node.parentNode && node.parentNode.removeChild) node.parentNode.removeChild(node);
      else if (typeof node.remove === "function") node.remove();
    }

    return {
      gap: gap,
      px: px,
      get spawned() { return count; },
      spawn: function (x, y) {
        var t = now();
        if (t - last < gap) return false;
        last = t;
        count += 1;
        var node = makeNode(x, y);
        doc.body.appendChild(node);
        schedule(function () { removeNode(node); }, TRAIL_MS);
        return true;
      },
      reset: function () { last = -Infinity; count = 0; },
    };
  }

  /* ---------------- runtime ---------------- */

  function boot() {
    if (!D) return;

    var browser = globalThis.browser || globalThis.chrome;
    if (!browser || !browser.storage) return;

    var store = browser.storage.sync || browser.storage.local;
    if (!store || typeof store.get !== "function") return;

    var handler = null;
    var styleEl = null;

    function prefersReduced() {
      try {
        return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e) { return false; }
    }

    function hostname() {
      try { return (typeof location !== "undefined" && location.hostname) || ""; }
      catch (e) { return ""; }
    }

    function ensureStyle() {
      if (styleEl || typeof document === "undefined" || !document.head) return;
      if (typeof document.getElementById === "function" && document.getElementById("mena-cursor-style")) {
        styleEl = document.getElementById("mena-cursor-style");
        return;
      }
      styleEl = document.createElement("style");
      styleEl.id = "mena-cursor-style";
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    function stop() {
      if (handler && typeof document.removeEventListener === "function") {
        document.removeEventListener("mousemove", handler);
      }
      handler = null;
    }

    function start(settings) {
      ensureStyle();
      var engine = createEngine(document, settings);
      handler = function (ev) { engine.spawn(ev.clientX, ev.clientY); };
      document.addEventListener("mousemove", handler, { passive: true });
    }

    function apply(raw) {
      var settings = D.normalize(raw);
      stop();
      if (shouldTrail(settings, hostname(), prefersReduced())) start(settings);
    }

    try {
      store.get({ settings: D.DEFAULTS }, function (res) {
        apply(res && res.settings ? res.settings : D.DEFAULTS);
      });
    } catch (e) { /* leave the page untouched */ }

    /* Remember where we are so the popup can offer "disable this site"
     * without needing the "tabs" permission. */
    try {
      var local = browser.storage.local;
      if (local && typeof local.set === "function") local.set({ lastHost: hostname() });
    } catch (e) { /* ignore */ }

    try {
      if (browser.storage.onChanged && browser.storage.onChanged.addListener) {
        browser.storage.onChanged.addListener(function (changes) {
          if (changes && changes.settings) apply(changes.settings.newValue);
        });
      }
    } catch (e) { /* ignore */ }
  }

  var api = {
    TRAIL_MS: TRAIL_MS,
    STYLES: STYLES,
    shouldTrail: shouldTrail,
    createEngine: createEngine,
  };

  if (typeof globalThis !== "undefined") globalThis.LoveCursor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  try { boot(); } catch (e) { /* never break the host page */ }
})();
