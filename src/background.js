"use strict";

/* love-cursor-ext — background.
 *
 * Keeps it tiny: on install, write the default settings so the popup and the
 * options page always have something to read. */

importScriptsSafe();

function importScriptsSafe() {
  try {
    if (typeof importScripts === "function") {
      importScripts("../common/data.js");
    }
  } catch (e) { /* MV3 service worker cannot always use importScripts */ }
}

function withData(cb) {
  if (typeof globalThis.LoveCursorData !== "undefined") return cb(globalThis.LoveCursorData);
  try {
    if (typeof importScripts === "function") {
      importScripts("../common/data.js");
    }
  } catch (e) { /* ignore */ }
  if (typeof globalThis.LoveCursorData === "undefined") {
    // Minimal fallback if data.js could not be loaded.
    globalThis.LoveCursorData = { DEFAULTS: { enabled: true, type: "hearts", density: "medium", size: "medium", disabledSites: [], respectReducedMotion: true }, normalize: function (s) { return s; } };
  }
  cb(globalThis.LoveCursorData);
}

var api = globalThis.browser || globalThis.chrome;

function ensureDefaults() {
  if (!api || !api.storage) return;
  var store = api.storage.sync || api.storage.local;
  if (!store || typeof store.get !== "function") return;
  withData(function (D) {
    store.get({ settings: D.DEFAULTS }, function (res) {
      var merged = D.normalize(res && res.settings);
      try { store.set({ settings: merged }); } catch (e) { /* ignore */ }
    });
  });
}

if (api && api.runtime && api.runtime.onInstalled && api.runtime.onInstalled.addListener) {
  api.runtime.onInstalled.addListener(ensureDefaults);
}
