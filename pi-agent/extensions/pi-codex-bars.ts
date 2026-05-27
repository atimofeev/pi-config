/**
 * pi-codex-bars — Codex usage widget for pi
 *
 * Shows session & daily OpenAI Codex usage limits as a centred widget
 * between the editor and footer. Coexists with pi-go-bars.
 *
 * Usage:
 *   Widget auto-shows when active provider is openai-codex
 *   /codex — detail overlay with full-width bars
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  Container,
  Text,
  visibleWidth,
  type Component,
  type Focusable,
} from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CodexUsageWindow {
  usagePercent: number;
  resetInSec: number;
}

interface CodexUsageData {
  session: CodexUsageWindow | null;
  daily: CodexUsageWindow | null;
  error?: string;
  stale?: boolean;
  warning?: string;
  fetchedAt?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════════════════════

const AUTH_FILE = path.join(os.homedir(), ".pi", "agent", "auth.json");

function readCodexToken(): string | null {
  try {
    const raw = fs.readFileSync(AUTH_FILE, "utf-8");
    const auth = JSON.parse(raw) as Record<string, any>;
    return auth?.["openai-codex"]?.access || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 90_000;
const CACHE_FILE = path.join(os.tmpdir(), "pi", "pi-codex-bars-cache.json");

function readCache(): CodexUsageData | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const entry = JSON.parse(raw) as { data: CodexUsageData; ts: number };
    if (entry?.data && typeof entry.ts === "number") return entry.data;
  } catch { /* ignore */ }
  return null;
}

function writeCache(data: CodexUsageData): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = `${CACHE_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ data, ts: Date.now() }));
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, CACHE_FILE);
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fetch
// ═══════════════════════════════════════════════════════════════════════════════

const CODX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const FETCH_TIMEOUT_MS = 12_000;

async function fetchCodexUsage(token: string): Promise<CodexUsageData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(CODX_USAGE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!resp.ok) {
      return { session: null, daily: null, error: `HTTP ${resp.status}`, fetchedAt: Date.now() };
    }
    const data = await resp.json() as any;
    const primary = data?.rate_limit?.primary_window;
    const secondary = data?.rate_limit?.secondary_window;
    return {
      session: {
        usagePercent: typeof primary?.used_percent === "number" ? primary.used_percent : 0,
        resetInSec: typeof primary?.reset_after_seconds === "number" ? primary.reset_after_seconds : 0,
      },
      daily: {
        usagePercent: typeof secondary?.used_percent === "number" ? secondary.used_percent : 0,
        resetInSec: typeof secondary?.reset_after_seconds === "number" ? secondary.reset_after_seconds : 0,
      },
      fetchedAt: Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { session: null, daily: null, error: msg, fetchedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithCache(): Promise<CodexUsageData> {
  const token = readCodexToken();
  if (!token) return { session: null, daily: null, error: "no Codex auth (run /login)" };
  const cached = readCache();
  if (cached && Date.now() - (cached.fetchedAt ?? 0) < CACHE_TTL_MS) return cached;
  try {
    const data = await fetchCodexUsage(token);
    writeCache(data);
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stale = readCache();
    if (stale) return { ...stale, stale: true, warning: `stale (${msg})` };
    return { session: null, daily: null, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Formatting helpers
// ═══════════════════════════════════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "now";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "<1m";
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function colorForPercent(value: number): "success" | "warning" | "error" {
  if (value >= 90) return "error";
  if (value >= 70) return "warning";
  return "success";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI helpers
// ═══════════════════════════════════════════════════════════════════════════════

function fgToBgAnsi(fgAnsi: string): string {
  const m256 = fgAnsi.match(/\x1b\[38;5;(\d+)m/);
  if (m256) return `\x1b[48;5;${m256[1]}m`;
  const mTrue = fgAnsi.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (mTrue) return `\x1b[48;2;${mTrue[1]};${mTrue[2]};${mTrue[3]}m`;
  return fgAnsi.replace("[38", "[48");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bar rendering
// ═══════════════════════════════════════════════════════════════════════════════

interface Win {
  label: string;
  pct: number;
  resetSec: number;
}

function renderBarSegment(t: any, w: Win, barSlots: number): string {
  const barCol = "muted";
  const barBg = fgToBgAnsi(t.getFgAnsi(barCol));
  const v = clampPercent(w.pct);
  const label = v + "%";
  const lw = label.length;
  const bw = barSlots;

  if (v === 0) {
    return t.fg(barCol, label) + t.fg("dim", "\u2591".repeat(Math.max(0, bw - lw)));
  }

  const filled = Math.max(1, Math.round((v / 100) * bw));
  const before = Math.max(0, Math.min(filled, Math.floor((filled - lw) / 2)));
  const after = Math.max(0, filled - before - lw);
  const empty = Math.max(0, bw - before - lw - after);

  return (
    t.fg(barCol, "\u2588".repeat(before)) +
    barBg + t.bold(label) + "\x1b[39m\x1b[49m" +
    t.fg(barCol, "\u2588".repeat(after)) +
    t.fg("dim", "\u2591".repeat(empty))
  );
}

function renderWidgetLine(
  t: any,
  data: CodexUsageData | null,
  loading: boolean,
  width: number,
): string {
  if (loading) return center(t.fg("dim", "Codex loading..."), width);

  if (!data || data.error) {
    return center(t.fg("dim", "Codex " + (data?.error ?? "no data")), width);
  }

  const elapsed = data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt) / 1000) : 0;

  const wins: Win[] = [];
  if (data.session) {
    wins.push({ label: "S", pct: data.session.usagePercent, resetSec: Math.max(0, data.session.resetInSec - elapsed) });
  }
  if (data.daily) {
    wins.push({ label: "W", pct: data.daily.usagePercent, resetSec: Math.max(0, data.daily.resetInSec - elapsed) });
  }
  if (wins.length === 0) return "";

  const staleSuffix = data.stale ? t.fg("warning", " stale") : "";
  const staleW = visibleWidth(staleSuffix);

  const MIN_BAR = 4;
  const MAX_BAR = 20;
  let showResets = true;

  let fixed = visibleWidth("Codex");
  for (const w of wins) {
    fixed += 1 + w.label.length + 1;
    if (showResets && w.resetSec > 0) fixed += 3 + visibleWidth(formatDuration(w.resetSec));
  }
  fixed += staleW;

  let barSlots = Math.min(MAX_BAR, Math.floor((width - fixed) / wins.length));

  if (barSlots < 5) {
    showResets = false;
    fixed = visibleWidth("Codex");
    for (const w of wins) fixed += 1 + w.label.length + 1;
    fixed += staleW;
    barSlots = Math.min(MAX_BAR, Math.floor((width - fixed) / wins.length));
  }

  barSlots = Math.max(MIN_BAR, barSlots);

  const parts: string[] = [t.fg("dim", "Codex")];
  for (const w of wins) {
    parts.push(t.fg("muted", " " + w.label + " "));
    parts.push(renderBarSegment(t, w, barSlots));
    if (showResets && w.resetSec > 0) {
      parts.push(t.fg("dim", " \u27F3 " + formatDuration(w.resetSec)));
    }
  }

  return center(parts.join("") + staleSuffix, width);
}

function center(text: string, width: number): string {
  const tw = visibleWidth(text);
  if (tw >= width) return text;
  return " ".repeat(Math.floor((width - tw) / 2)) + text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Widget component
// ═══════════════════════════════════════════════════════════════════════════════

class CodexWidget implements Component {
  private state: { data: CodexUsageData | null; loading: boolean };
  private theme: any;

  constructor(state: { data: CodexUsageData | null; loading: boolean }, theme: any) {
    this.state = state;
    this.theme = theme;
  }

  invalidate() {}

  render(width: number): string[] {
    const line = renderWidgetLine(this.theme, this.state.data, this.state.loading, width);
    return line ? [line] : [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detail overlay
// ═══════════════════════════════════════════════════════════════════════════════

function buildDetailOverlay(
  theme: any,
  data: CodexUsageData | null,
  loading: boolean,
  done: () => void,
): Container & Focusable {
  const t = theme;
  const comp = new Container() as Container & Focusable;
  (comp as any)._focused = true;
  comp.handleInput = () => done();

  const lines: string[] = [];
  lines.push(t.bold("OpenAI Codex \u2014 Usage"));
  lines.push("");

  if (loading) {
    lines.push(t.fg("dim", "Loading\u2026"));
  } else if (!data) {
    lines.push(t.fg("dim", "No data"));
  } else if (data.error) {
    lines.push(t.fg("error", data.error));
  } else {
    if (data.stale && data.warning) {
      lines.push(t.fg("warning", "\u26A0 " + data.warning));
      lines.push("");
    }

    const renderWin = (label: string, w: CodexUsageWindow | null) => {
      if (!w) return;
      const pct = clampPercent(w.usagePercent);
      const color = colorForPercent(pct);
      const barW = 16;
      const filled = Math.round((pct / 100) * barW);
      const bar =
        t.fg(color, "\u2588".repeat(Math.max(0, filled))) +
        t.fg("dim", "\u2591".repeat(Math.max(0, barW - filled)));
      const reset =
        w.resetInSec > 0
          ? t.fg("dim", "  resets in " + formatDuration(w.resetInSec))
          : "";
      lines.push(
        t.fg("muted", label.padEnd(10)) + bar + " " + t.fg(color, `${pct}%`) + reset,
      );
      lines.push("");
    };

    renderWin("Session", data.session);
    renderWin("Daily", data.daily);
  }

  lines.push(t.fg("dim", "Press any key to close"));

  for (const line of lines) comp.addChild(new Text(line, 0, 0));
  return comp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Extension entry point
// ═══════════════════════════════════════════════════════════════════════════════

const POLL_INTERVAL_MS = 60_000;
const WIDGET_KEY = "pi-codex-bars";

function isCodexModel(model: { provider: string } | undefined | null): boolean {
  return model?.provider === "openai-codex";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Suppress "Codex adapter" status from @howaboua/pi-codex-conversion
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Known/predicted status keys that @howaboua/pi-codex-conversion
 * uses for its footer indicator. If the key changes in a future
 * update, add the new key here.
 */
const CODX_ADAPTER_STATUS_KEYS = [
  "codex-adapter",          // current (v1.5.3)
  "pi-codex-adapter",       // plausible rename
  "codex-conversion",        // plausible rename
];

/**
 * Suppress the "Codex adapter" footer status set by
 * @howaboua/pi-codex-conversion.
 *
 * Simply clears all known keys. Failures are silently ignored
 * — if the key changes, suppression stops working gracefully
 * (status reappears) rather than crashing.
 */
function suppressCodexAdapterStatus(ctx: any) {
  if (!ctx?.hasUI) return;
  for (const key of CODX_ADAPTER_STATUS_KEYS) {
    try { ctx.ui.setStatus(key, undefined); } catch { /* key may not exist */ }
  }
}

/** Restore adapter status when switching away from Codex. */
function restoreCodexAdapterStatus(ctx: any) {
  if (!ctx?.hasUI) return;
  // Clear override — adapter will re-set on its own handler.
  for (const key of CODX_ADAPTER_STATUS_KEYS) {
    try { ctx.ui.setStatus(key, undefined); } catch { /* ignore */ }
  }
}

export default function (pi: ExtensionAPI) {
  const state = { data: null as CodexUsageData | null, loading: true };

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollInFlight: Promise<void> | null = null;
  let pollQueued = false;
  let widgetActive = false;

  async function runPoll() {
    state.data = await fetchWithCache();
  }

  async function poll() {
    if (pollInFlight) { pollQueued = true; await pollInFlight; return; }
    do {
      pollQueued = false;
      pollInFlight = runPoll().finally(() => { pollInFlight = null; state.loading = false; });
      await pollInFlight;
    } while (pollQueued);
  }

  function showWidget(ctx: any) {
    if (!ctx?.ui) return;
    try {
      ctx.ui.setWidget(
        WIDGET_KEY,
        (_tui: any, theme: any) => new CodexWidget(state, theme),
        { placement: "belowEditor" },
      );
      widgetActive = true;
    } catch { /* ignore */ }
  }

  function hideWidget(ctx: any) {
    try { ctx?.ui?.setWidget(WIDGET_KEY, undefined); } catch { /* ignore */ }
    widgetActive = false;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  pi.on("session_start", async (_event, _ctx) => {
    if (!isCodexModel(_ctx.model)) return;
    showWidget(_ctx);
    await poll();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
  });

  // Suppress adapter status on every turn when Codex is active.
  // turn_start fires after model_select — gives adapter time to set
  // its status first, then we clear. Defensive: if adapter changes
  // timing, status merely reappears instead of breaking.
  pi.on("turn_start", async (_event, _ctx) => {
    if (isCodexModel(_ctx.model)) suppressCodexAdapterStatus(_ctx);
  });

  pi.on("model_select", async (_event, _ctx) => {
    if (!isCodexModel(_event.model)) {
      hideWidget(_ctx);
      restoreCodexAdapterStatus(_ctx);
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    if (!widgetActive) {
      showWidget(_ctx);
      await poll();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    }
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    hideWidget(_ctx);
    restoreCodexAdapterStatus(_ctx);
  });

  // ── Commands ───────────────────────────────────────────────────────────

  pi.registerCommand("codex", {
    description: "Show OpenAI Codex usage (session / daily)",
    handler: async (_args, _ctx) => {
      try {
        if (_ctx.ui) {
          await _ctx.ui.custom(
            (_tui: any, theme: any, _kb: any, done: any) =>
              buildDetailOverlay(theme, state.data, state.loading, done),
          );
        }
      } catch { /* ignore */ }
      await poll();
    },
  });
}
