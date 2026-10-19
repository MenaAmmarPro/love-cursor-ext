"use strict";

/* love-cursor-ext — popup logic. */

(function () {
  var D = globalThis.LoveCursorData;
  var browser = globalThis.browser || globalThis.chrome;
  var store = browser.storage.sync || browser.storage.local;

  function byId(id) { return document.getElementById(id); }

  function render(settings) {
    var enabled = byId("enabled");
    var type = byId("type");
    var density = byId("density");
    if (enabled) enabled.checked = !!settings.enabled;
    if (type) type.value = settings.type;
    if (density) density.value = settings.density;
  }

  function read() {
    var enabled = byId("enabled");
    var type = byId("type");
    var density = byId("density");
    return {
      enabled: enabled ? enabled.checked : true,
      type: type ? type.value : "hearts",
      density: density ? density.value : "medium",
    };
  }

  function save(patch) {
    store.get({ settings: D.DEFAULTS }, function (res) {
      var next = D.normalize(Object.assign({}, res && res.settings, patch));
      store.set({ settings: next }, function () { render(next); });
    });
  }

  function showHost(note) {
    /* The content script records the host it is running on, so we can offer
     * "disable this site" with only the "storage" permission. */
    try {
      var local = browser.storage.local;
      if (local && local.get) {
        local.get({ lastHost: "" }, function (res) {
          if (note) note.dataset.host = (res && res.lastHost) || "";
        });
      }
    } catch (e) { /* ignore */ }
  }

  function init() {
    store.get({ settings: D.DEFAULTS }, function (res) {
      var settings = D.normalize(res && res.settings);
      render(settings);

      var enabled = byId("enabled");
      if (enabled) enabled.addEventListener("change", function () { save({ enabled: enabled.checked }); });

      var type = byId("type");
      if (type) type.addEventListener("change", function () { save({ type: type.value }); });

      var density = byId("density");
      if (density) density.addEventListener("change", function () { save({ density: density.value }); });

      var note = byId("site-note");
      showHost(note);

      var disableBtn = byId("disable-site");
      if (disableBtn) {
        disableBtn.addEventListener("click", function () {
          var local = browser.storage.local;
          function withHost(host) {
            store.get({ settings: D.DEFAULTS }, function (res2) {
              var current = D.normalize(res2 && res2.settings);
              if (host && current.disabledSites.indexOf(host) < 0) {
                current.disabledSites.push(host);
              }
              store.set({ settings: current }, function () {
                if (note) note.textContent = host ? ("Off for " + host) : "Turned the trail off here";
              });
            });
          }
          if (local && local.get) {
            local.get({ lastHost: "" }, function (res) { withHost((res && res.lastHost) || ""); });
          } else {
            withHost((note && note.dataset && note.dataset.host) || "");
          }
        });
      }

      var optionsBtn = byId("open-options");
      if (optionsBtn) {
        optionsBtn.addEventListener("click", function () {
          try {
            if (browser.runtime.openOptionsPage) browser.runtime.openOptionsPage();
          } catch (e) { /* ignore */ }
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
