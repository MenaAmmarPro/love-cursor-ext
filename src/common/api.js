"use strict";

/* love-cursor-ext — the one shared handle for browser APIs.
 * Loaded first, as a plain script, before every other script. */

const api = globalThis.browser || globalThis.chrome;
