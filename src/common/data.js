"use strict";

/* love-cursor-ext — option schema, defaults and small pure helpers.
 * Pure: no browser API, so it can be unit-tested in Node. */

(function () {
  var STORAGE_KEY = "settings";

  var DEFAULTS = {
    enabled: true,
    type: "hearts", // hearts | sparkles | both
    density: "medium", // low | medium | high
    size: "medium", // small | medium | large
    disabledSites: [], // ["example.com", ...]
    respectReducedMotion: true,
  };

  var TYPES = ["hearts", "sparkles", "both"];
  var DENSITIES = ["low", "medium", "high"];
  var SIZES = ["small", "medium", "large"];

  var GLYPHS = {
    hearts: "\u2665",
    sparkles: "\u2726",
    both: ["\u2665", "\u2726"],
  };

  function pick(value, allowed, fallback) {
    return allowed.indexOf(value) >= 0 ? value : fallback;
  }

  /* Fill in defaults and drop anything that is not a valid value. */
  function normalize(input) {
    var s = input && typeof input === "object" ? input : {};
    var sites = Array.isArray(s.disabledSites) ? s.disabledSites : DEFAULTS.disabledSites;
    var clean = [];
    for (var i = 0; i < sites.length; i++) {
      var host = String(sites[i] || "").trim().toLowerCase();
      if (host && clean.indexOf(host) < 0) clean.push(host);
    }
    return {
      enabled: s.enabled === undefined ? DEFAULTS.enabled : !!s.enabled,
      type: pick(s.type, TYPES, DEFAULTS.type),
      density: pick(s.density, DENSITIES, DEFAULTS.density),
      size: pick(s.size, SIZES, DEFAULTS.size),
      disabledSites: clean,
      respectReducedMotion:
        s.respectReducedMotion === undefined ? DEFAULTS.respectReducedMotion : !!s.respectReducedMotion,
    };
  }

  /* Is this hostname (or a subdomain of it) on the disable list? */
  function isHostDisabled(list, host) {
    if (!Array.isArray(list) || !host) return false;
    var name = String(host).toLowerCase();
    for (var i = 0; i < list.length; i++) {
      var entry = String(list[i] || "").trim().toLowerCase();
      if (!entry) continue;
      if (name === entry || name.slice(-(entry.length + 1)) === "." + entry) return true;
    }
    return false;
  }

  /* Milliseconds between trail nodes for each density. */
  function densityGap(density) {
    if (density === "low") return 200;
    if (density === "high") return 45;
    return 95;
  }

  /* Node font-size in pixels for each size. */
  function sizePx(size) {
    if (size === "small") return 12;
    if (size === "large") return 30;
    return 20;
  }

  /* The glyph to show for a type (both = pick randomly at call time). */
  function glyphFor(type) {
    var g = GLYPHS[type] || GLYPHS.hearts;
    if (Array.isArray(g)) return g[Math.floor(Math.random() * g.length)];
    return g;
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULTS: DEFAULTS,
    TYPES: TYPES,
    DENSITIES: DENSITIES,
    SIZES: SIZES,
    GLYPHS: GLYPHS,
    normalize: normalize,
    isHostDisabled: isHostDisabled,
    densityGap: densityGap,
    sizePx: sizePx,
    glyphFor: glyphFor,
  };

  if (typeof globalThis !== "undefined") globalThis.LoveCursorData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
