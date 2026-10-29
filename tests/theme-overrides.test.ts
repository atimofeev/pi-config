import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(tmpdir(), "pi-coding-agent", "theme-overrides-tests");
mkdirSync(root, { recursive: true });
const home = mkdtempSync(join(root, "run-"));
after(() => rmSync(home, { recursive: true, force: true }));
const settingsDir = join(home, ".pi", "agent");
mkdirSync(settingsDir, { recursive: true });
writeFileSync(join(settingsDir, "settings.json"), JSON.stringify({
  theme: "test-theme", themeOverrides: { toolSuccessBg: "#11111b" },
}));
const themePath = join(home, "theme.json");
writeFileSync(themePath, JSON.stringify({ name: "test-theme", colors: {
  text: "#ffffff", selectedBg: "#000000", userMessageBg: "#000000",
  customMessageBg: "#000000", toolPendingBg: "#000000",
  toolSuccessBg: "#000000", toolErrorBg: "#000000",
} }));

// Only mock Pi's runtime import; exercise the real extension and settings reads.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@earendil-works/pi-coding-agent") {
      return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(`
        export class Theme {
          constructor(fg, bg, mode, options) {
            this.fg = fg; this.bg = bg; this.mode = mode; this.colors = { ...fg, ...bg };
            Object.assign(this, options);
          }
        }
      `) };
    }
    return nextResolve(specifier, context);
  },
});
const previousHome = process.env.HOME;
let factory: typeof import("../pi-agent/extensions/theme-overrides.ts").default;
try {
  process.env.HOME = home;
  factory = (await import("../pi-agent/extensions/theme-overrides.ts")).default;
} finally {
  if (previousHome === undefined) delete process.env.HOME;
  else process.env.HOME = previousHome;
  hooks.deregister();
}

function harness(t: any) {
  const timers = new Map<object, () => void>();
  t.mock.method(globalThis, "setInterval", (callback: () => void, delay: number) => {
    assert.equal(delay, 250);
    const timer = { unref() {} };
    timers.set(timer, callback);
    return timer;
  });
  t.mock.method(globalThis, "clearInterval", (timer: object) => timers.delete(timer));
  const handlers = new Map<string, Function>();
  factory({ on: (event: string, callback: Function) => handlers.set(event, callback) } as any);
  let applies = 0;
  let reads = 0;
  const notifications: string[] = [];
  let activeTheme: any = { colors: {} };
  const themeProxy = new Proxy({}, { get: (_target, key) => activeTheme[key] });
  const ctx = { hasUI: true, ui: {
    get theme(): any { return themeProxy; },
    set theme(theme: any) { activeTheme = theme; },
    getTheme() { reads++; return { sourcePath: themePath }; },
    setTheme(theme: any) { applies++; activeTheme = theme; return { success: true }; },
    notify(message: string) { notifications.push(message); },
  } };
  return {
    ctx, timers, notifications,
    start(reason = "startup") { handlers.get("session_start")!({ reason }, ctx); },
    shutdown() { handlers.get("session_shutdown")!({ reason: "reload" }, ctx); },
    tick() { for (const callback of timers.values()) callback(); },
    get applies() { return applies; },
    get reads() { return reads; },
  };
}

test("reapplies after arbitrarily late base-theme reset without rebuilding unchanged themes", (t) => {
  const h = harness(t);
  h.start();
  assert.equal(h.ctx.ui.theme.bg.toolSuccessBg, "#11111b");
  for (let i = 0; i < 20; i++) h.tick();
  assert.equal(h.applies, 1);
  assert.equal(h.reads, 1);
  const proxy = h.ctx.ui.theme;
  h.ctx.ui.theme = { colors: {} };
  assert.equal(h.ctx.ui.theme, proxy);
  h.tick();
  assert.equal(h.ctx.ui.theme.bg.toolSuccessBg, "#11111b");
  h.tick();
  assert.equal(h.applies, 2);
  assert.equal(h.reads, 2);
  assert.deepEqual(h.notifications, []);
  h.shutdown();
});

test("resume, reload, new and fork replace timers; shutdown cancels stale callbacks", (t) => {
  const h = harness(t);
  for (const reason of ["startup", "resume", "reload", "new", "fork"]) {
    h.start(reason);
    assert.equal(h.timers.size, 1);
    h.ctx.ui.theme = { colors: {} };
    h.tick();
    assert.equal(h.ctx.ui.theme.bg.toolSuccessBg, "#11111b");
  }
  h.shutdown();
  h.shutdown();
  assert.equal(h.timers.size, 0);
  const applies = h.applies;
  h.ctx.ui.theme = { colors: {} };
  h.tick();
  assert.equal(h.applies, applies);
});

test("headless session starts no timer and does not set theme", (t) => {
  const h = harness(t);
  h.ctx.hasUI = false;
  h.start();
  assert.equal(h.timers.size, 0);
  assert.equal(h.applies, 0);
});

test("invalid theme reports once per replacement, not on every tick", (t) => {
  const original = readFileSync(themePath, "utf8");
  try {
    writeFileSync(themePath, "invalid");
    const h = harness(t);
    h.start();
    for (let i = 0; i < 20; i++) h.tick();
    assert.equal(h.notifications.length, 1);
    assert.equal(h.applies, 0);
    h.shutdown();
  } finally {
    writeFileSync(themePath, original);
  }
});
