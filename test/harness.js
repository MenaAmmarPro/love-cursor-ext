"use strict";

/*
 * love-cursor-ext — Node harness (no dependencies).
 *
 *   node test/harness.js
 *
 * Mocks the `api` (storage/runtime), loads the content-script chain
 * (api.js -> data.js -> cursor.js) in a bare sandbox, and checks the option
 * defaults plus the trail-spawn logic. All assertions must pass.
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

/* ---------- a tiny in-memory `storage` ---------- */
const stored = { settings: undefined, lastHost: undefined };
let onChangedListener = null;

function deepClone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

const chromeMock = {
  storage: {
    sync: {
      get(defaults, cb) {
        const out = {};
        if (defaults && typeof defaults === "object") {
          for (const k of Object.keys(defaults)) {
            out[k] = stored[k] === undefined ? deepClone(defaults[k]) : deepClone(stored[k]);
          }
        } else {
          out.settings = deepClone(stored.settings);
        }
        if (cb) cb(out);
      },
      set(obj, cb) {
        if (obj && typeof obj === "object") for (const k of Object.keys(obj)) stored[k] = deepClone(obj[k]);
        if (cb) cb();
      },
    },
    local: {
      get(defaults, cb) {
        const out = {};
        if (defaults && typeof defaults === "object") {
          for (const k of Object.keys(defaults)) {
            out[k] = stored[k] === undefined ? deepClone(defaults[k]) : deepClone(stored[k]);
          }
        } else {
          out.lastHost = deepClone(stored.lastHost);
        }
        if (cb) cb(out);
      },
      set(obj, cb) {
        if (obj && typeof obj === "object") for (const k of Object.keys(obj)) stored[k] = deepClone(obj[k]);
        if (cb) cb();
      },
    },
    onChanged: { addListener(fn) { onChangedListener = fn; } },
  },
  runtime: { openOptionsPage() {} },
};

/* ---------- a tiny document ---------- */
function makeNode(tag) {
  return {
    tagName: tag || "SPAN",
    className: "",
    id: "",
    textContent: "",
    parentNode: null,
    style: { setProperty(k, v) { this[k] = v; } },
    setAttribute() {},
    addEventListener() {},
    remove() { if (this.parentNode && this.parentNode.removeChild) this.parentNode.removeChild(this); },
  };
}

const bodyChildren = [];
const headChildren = [];
const docListeners = {};

const body = {
  appendChild(node) { node.parentNode = body; bodyChildren.push(node); return node; },
  removeChild(node) { const i = bodyChildren.indexOf(node); if (i >= 0) bodyChildren.splice(i, 1); node.parentNode = null; return node; },
};
const head = { appendChild(node) { headChildren.push(node); return node; } };

const documentMock = {
  head,
  body,
  readyState: "complete",
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => makeNode(tag),
  addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  removeEventListener(type, fn) {
    if (docListeners[type]) docListeners[type] = docListeners[type].filter((f) => f !== fn);
  },
};
function listenerCount(type) { return (docListeners[type] || []).length; }

/* ---------- the sandbox ---------- */
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN,
  chrome: chromeMock,
  browser: undefined,
  document: documentMock,
  location: { hostname: "example.com" },
  matchMedia: () => ({ matches: false }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, "..");
for (const rel of ["src/common/api.js", "src/common/data.js", "src/content/cursor.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}

const D = sandbox.LoveCursorData;
const C = sandbox.LoveCursor;

let failures = 0;
function assert(cond, message) {
  if (!cond) { console.error("FAIL: " + message); failures += 1; }
  else console.log("ok - " + message);
}
function eq(a, b, message) { assert(a === b, message + " (" + a + " == " + b + ")"); }

/* ---------- option defaults ---------- */
assert(!!D, "LoveCursorData exposed");
assert(!!C, "LoveCursor exposed");
eq(D.DEFAULTS.enabled, true, "default: trail enabled");
eq(D.DEFAULTS.type, "hearts", "default: hearts");
eq(D.DEFAULTS.density, "medium", "default: medium density");
eq(D.DEFAULTS.size, "medium", "default: medium size");
eq(D.DEFAULTS.respectReducedMotion, true, "default: respects reduced motion");
assert(Array.isArray(D.DEFAULTS.disabledSites) && D.DEFAULTS.disabledSites.length === 0, "default: no disabled sites");
eq(D.TYPES.join(","), "hearts,sparkles,both", "type options");
eq(D.DENSITIES.join(","), "low,medium,high", "density options");
eq(D.SIZES.join(","), "small,medium,large", "size options");

/* ---------- normalize fills + validates ---------- */
const dflt = D.normalize(undefined);
assert(dflt.enabled === true && dflt.type === "hearts" && dflt.density === "medium" &&
  dflt.size === "medium" && dflt.respectReducedMotion === true && dflt.disabledSites.length === 0,
  "normalize(undefined) returns the defaults");

const bad = D.normalize({ type: "nope", density: "nope", size: "nope", disabledSites: [" A.com ", "a.com", "", 42] });
eq(bad.type, "hearts", "invalid type falls back");
eq(bad.density, "medium", "invalid density falls back");
eq(bad.size, "medium", "invalid size falls back");
eq(bad.disabledSites.join(","), "a.com,42", "disabledSites trimmed, lowercased, de-duplicated");

const off = D.normalize({ enabled: false, respectReducedMotion: false, type: "sparkles", size: "large" });
assert(off.enabled === false && off.respectReducedMotion === false && off.type === "sparkles" && off.size === "large",
  "normalize keeps valid overrides");

/* ---------- helper constants ---------- */
eq(D.densityGap("low"), 200, "low density gap");
eq(D.densityGap("medium"), 95, "medium density gap");
eq(D.densityGap("high"), 45, "high density gap");
eq(D.sizePx("small"), 12, "small px");
eq(D.sizePx("medium"), 20, "medium px");
eq(D.sizePx("large"), 30, "large px");
eq(D.glyphFor("hearts"), "\u2665", "heart glyph");
eq(D.glyphFor("sparkles"), "\u2726", "sparkle glyph");
assert(["\u2665", "\u2726"].indexOf(D.glyphFor("both")) >= 0, "both -> a heart or a sparkle");

/* ---------- per-site disable matching ---------- */
assert(D.isHostDisabled(["example.com"], "example.com") === true, "exact host disabled");
assert(D.isHostDisabled(["example.com"], "www.example.com") === true, "subdomain disabled");
assert(D.isHostDisabled(["example.com"], "notexample.com") === false, "suffix is not a match");
assert(D.isHostDisabled([], "example.com") === false, "empty list = allowed");
assert(D.isHostDisabled(["example.com"], "") === false, "blank host = allowed");

/* ---------- shouldTrail ---------- */
assert(C.shouldTrail(D.normalize({}), "example.com", false) === true, "trail runs by default");
assert(C.shouldTrail(D.normalize({}), "example.com", true) === false, "reduced motion pauses the trail");
assert(C.shouldTrail(D.normalize({ respectReducedMotion: false }), "example.com", true) === true,
  "reduced-motion override lets it run");
assert(C.shouldTrail(D.normalize({ enabled: false }), "example.com", false) === false, "disabled setting stops it");
assert(C.shouldTrail(D.normalize({ disabledSites: ["example.com"] }), "example.com", false) === false,
  "disabled site stops it");
assert(C.shouldTrail(D.normalize({ disabledSites: ["example.com"] }), "shop.example.com", false) === false,
  "disabled site covers subdomains");
assert(C.shouldTrail(D.normalize({ disabledSites: ["other.com"] }), "example.com", false) === true,
  "other sites still run");

/* ---------- the trail engine ---------- */
const scheduled = [];
let clock = 5000;
const settings = D.normalize({ type: "hearts", density: "medium", size: "large" });
const engine = C.createEngine(documentMock, settings, {
  now: () => clock,
  schedule: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length; },
});

eq(engine.gap, 95, "engine uses the density gap");
eq(engine.px, 30, "engine uses the size in px");
assert(engine.spawn(10, 10) === true, "first spawn is allowed");
assert(engine.spawn(20, 20) === false, "second spawn is throttled inside the gap");
clock += 95;
assert(engine.spawn(30, 30) === true, "spawn is allowed once the gap has passed");
eq(engine.spawned, 2, "engine counts its spawns");

const node = bodyChildren[bodyChildren.length - 1];
assert(node.className.indexOf("mena-cursor-node") >= 0, "node has the base class");
assert(node.className.indexOf("mena-cursor-hearts") >= 0, "node carries the type class");
eq(node.textContent, "\u2665", "node shows the heart glyph");
eq(node.style.fontSize, "30px", "node font-size comes from the size setting");
eq(node.style.left, "30px", "node is placed at the pointer x");
eq(node.style.top, "30px", "node is placed at the pointer y");
assert(typeof node.style["--mena-dx"] === "string" && /px$/.test(node.style["--mena-dx"]), "drift var set (x)");
assert(typeof node.style["--mena-dy"] === "string" && /px$/.test(node.style["--mena-dy"]), "drift var set (y)");

eq(scheduled.length, 2, "a removal is scheduled per node");
eq(scheduled[0].ms, C.TRAIL_MS, "nodes live for TRAIL_MS");
const before = bodyChildren.length;
scheduled[0].fn();
eq(bodyChildren.length, before - 1, "the node is removed after its lifetime");

/* low density is slower */
const slow = C.createEngine(documentMock, D.normalize({ density: "low" }), { now: () => 0, schedule: () => 0 });
eq(slow.gap, 200, "low density engine gap");

/* type/content of sparkles */
const sparkEngine = C.createEngine(documentMock, D.normalize({ type: "sparkles", size: "small" }), { now: () => 0, schedule: () => 0 });
const nodesBefore = bodyChildren.length;
sparkEngine.spawn(1, 1);
const snode = bodyChildren[nodesBefore];
assert(snode.className.indexOf("mena-cursor-sparkles") >= 0, "sparkle node carries the sparkles class");
eq(snode.textContent, "\u2726", "sparkle node shows the sparkle glyph");
eq(snode.style.fontSize, "12px", "sparkle node uses the small size");

/* ---------- styles respect reduced motion ---------- */
assert(C.STYLES.indexOf("prefers-reduced-motion") >= 0, "injected CSS honours prefers-reduced-motion");

/* ---------- boot wired itself up against the mocked api ---------- */
assert(!!onChangedListener, "boot subscribed to storage changes");
eq(stored.lastHost, "example.com", "boot recorded the current host for the popup");
eq(listenerCount("mousemove"), 1, "boot started the trail (a mousemove listener)");
eq(headChildren.length, 1, "boot injected the trail stylesheet once");

/* firing a move should append a node */
const beforeMove = bodyChildren.length;
docListeners.mousemove[0]({ clientX: 123, clientY: 45 });
eq(bodyChildren.length, beforeMove + 1, "a pointer move spawns a node");

/* turning the site off should remove the listener */
onChangedListener({ settings: { newValue: { enabled: true, disabledSites: ["example.com"] } } });
eq(listenerCount("mousemove"), 0, "disabling the current site stops the trail");

/* re-enabling brings it back */
onChangedListener({ settings: { newValue: { enabled: true, disabledSites: [] } } });
eq(listenerCount("mousemove"), 1, "re-enabling the site restarts the trail");

/* ---------- done ---------- */
console.log("");
if (failures) {
  console.error(failures + " assertion(s) failed");
  process.exit(1);
} else {
  console.log("all assertions passed");
  process.exit(0);
}
