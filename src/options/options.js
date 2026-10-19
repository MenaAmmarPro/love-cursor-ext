"use strict";

/* love-cursor-ext — options page logic. */

(function () {
  var D = globalThis.LoveCursorData;
  var C = globalThis.LoveCursor;
  var browser = globalThis.browser || globalThis.chrome;
  var store = browser.storage.sync || browser.storage.local;

  function byId(id) { return document.getElementById(id); }

  function listToText(list) { return (list || []).join("\n"); }
  function textToList(text) {
    return String(text || "")
      .split(/[\n,]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function render(settings) {
    var enabled = byId("enabled");
    var type = byId("type");
    var density = byId("density");
    var size = byId("size");
    var rrm = byId("respect-reduced-motion");
    var sites = byId("disabled-sites");
    if (enabled) enabled.checked = !!settings.enabled;
    if (type) type.value = settings.type;
    if (density) density.value = settings.density;
    if (size) size.value = settings.size;
    if (rrm) rrm.checked = !!settings.respectReducedMotion;
    if (sites) sites.value = listToText(settings.disabledSites);
  }

  function readForm() {
    var enabled = byId("enabled");
    var type = byId("type");
    var density = byId("density");
    var size = byId("size");
    var rrm = byId("respect-reduced-motion");
    var sites = byId("disabled-sites");
    return {
      enabled: enabled ? enabled.checked : true,
      type: type ? type.value : "hearts",
      density: density ? density.value : "medium",
      size: size ? size.value : "medium",
      respectReducedMotion: rrm ? rrm.checked : true,
      disabledSites: sites ? textToList(sites.value) : [],
    };
  }

  function flash(message) {
    var status = byId("status");
    if (!status) return;
    status.textContent = message;
    setTimeout(function () { status.textContent = "\u00a0"; }, 2200);
  }

  /* A live preview: the same engine the content script uses. */
  var previewEngine = null;
  var previewBound = false;

  function preview() {
    var stage = byId("preview-stage");
    if (!stage || !C) return;

    if (!byId("mena-cursor-style")) {
      var style = document.createElement("style");
      style.id = "mena-cursor-style";
      style.textContent = C.STYLES;
      document.head.appendChild(style);
    }

    var settings = D.normalize(readForm());
    previewEngine = C.createEngine(document, settings);

    if (!previewBound) {
      stage.addEventListener("mousemove", function (ev) {
        if (previewEngine) previewEngine.spawn(ev.clientX, ev.clientY);
      });
      previewBound = true;
    }
  }

  function bindLivePreview() {
    ["enabled", "type", "density", "size"].forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener("change", preview);
    });
  }

  function init() {
    store.get({ settings: D.DEFAULTS }, function (res) {
      var settings = D.normalize(res && res.settings);
      render(settings);
      preview();
      bindLivePreview();

      var form = byId("options-form");
      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var next = D.normalize(readForm());
          store.set({ settings: next }, function () { flash("Saved \u2665"); });
        });
      }

      var reset = byId("reset");
      if (reset) {
        reset.addEventListener("click", function () {
          store.set({ settings: D.DEFAULTS }, function () {
            render(D.normalize(D.DEFAULTS));
            preview();
            flash("Back to the defaults");
          });
        });
      }
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
