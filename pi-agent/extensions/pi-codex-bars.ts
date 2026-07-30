/**
 * pi-codex-bars — Codex usage footer for pi
 *
 * Renders 5h OpenAI Codex usage inline in a custom 2-line footer
 * matching pi-go-bars layout. Replaces the old below-editor widget.
 *
 * Usage:
 *   Footer auto-shows when active provider is openai-codex
 *   /codex — detail overlay with full-width bars
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  Container,
  Text,
  truncateToWidth,
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
  usage: CodexUsageWindow | null;
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
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json() as any;
    const window = data?.rate_limit?.primary_window;
    return {
      usage: {
        usagePercent: typeof window?.used_percent === "number" ? window.used_percent : 0,
        resetInSec: typeof window?.reset_after_seconds === "number" ? window.reset_after_seconds : 0,
      },
      fetchedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithCache(): Promise<CodexUsageData> {
  const token = readCodexToken();
  if (!token) return { usage: null, error: "no Codex auth (run /login)" };
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
    return { usage: null, error: msg };
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

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
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

/** Compact Codex bar segment for footer. Returns "" if nothing fits. */
function renderFooterCodexBar(
  t: any,
  data: CodexUsageData | null,
  loading: boolean,
  maxWidth: number,
): string {
  if (loading) {
    return visibleWidth(t.fg("dim", "Codex loading...")) <= maxWidth
      ? t.fg("dim", "Codex loading...") : "";
  }
  if (!data || data.error) return "";
  if (!data.usage) return "";

  const staleSuffix = data.stale ? t.fg("warning", " stale") : "";
  const elapsed = data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt) / 1000) : 0;
  const w: Win = { label: "5h", pct: data.usage.usagePercent, resetSec: Math.max(0, data.usage.resetInSec - elapsed) };
  const staleW = visibleWidth(staleSuffix);

  // Determine minimum viable layout: try label+reset, then label only, then bare
  let barSlots = 4;
  let showLabel = false;
  let showReset = false;

  const bareWidth = visibleWidth("Codex") + 1 + 4 + staleW; // "Codex" + " " + bar + stale
  if (bareWidth > maxWidth) return "";

  const withLabelReset = visibleWidth("Codex") + 1 + w.label.length + 1 + 4 +
    (w.resetSec > 0 ? 3 + visibleWidth(formatDuration(w.resetSec)) : 0) + staleW;
  const withLabel = visibleWidth("Codex") + 1 + w.label.length + 1 + 4 + staleW;

  if (withLabelReset <= maxWidth) { showLabel = true; showReset = true; }
  else if (withLabel <= maxWidth) { showLabel = true; }
  // else bare: no label, no reset — 4-char bar only

  // Expand bar to fill remaining space
  let used = visibleWidth("Codex");
  used += showLabel ? 1 + w.label.length + 1 : 1;
  used += barSlots;
  if (showReset && w.resetSec > 0) used += 3 + visibleWidth(formatDuration(w.resetSec));
  used += staleW;
  const remaining = Math.max(0, maxWidth - used);
  barSlots = Math.min(20, barSlots + remaining);

  const parts: string[] = [t.fg("dim", "Codex")];
  if (showLabel) parts.push(t.fg("muted", " " + w.label + " "));
  else parts.push(" ");
  parts.push(renderBarSegment(t, w, barSlots));
  if (showReset && w.resetSec > 0)
    parts.push(t.fg("dim", " \u27F3 " + formatDuration(w.resetSec)));
  return parts.join("") + staleSuffix;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detail overlay (/codex)
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

    if (data.usage) {
      const pct = clampPercent(data.usage.usagePercent);
      const color = colorForPercent(pct);
      const barW = 16;
      const filled = Math.round((pct / 100) * barW);
      const bar =
        t.fg(color, "\u2588".repeat(Math.max(0, filled))) +
        t.fg("dim", "\u2591".repeat(Math.max(0, barW - filled)));
      const reset =
        data.usage.resetInSec > 0
          ? t.fg("dim", "  resets in " + formatDuration(data.usage.resetInSec))
          : "";
      lines.push(
        t.fg("muted", "5h".padEnd(10)) + bar + " " + t.fg(color, `${pct}%`) + reset,
      );
      lines.push("");
    }
  }

  lines.push(t.fg("dim", "Press any key to close"));

  for (const line of lines) comp.addChild(new Text(line, 0, 0));
  return comp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Extension entry point
// ═══════════════════════════════════════════════════════════════════════════════

const POLL_INTERVAL_MS = 60_000;

function isCodexModel(model: { provider: string } | undefined | null): boolean {
  return model?.provider === "openai-codex";
}

function isGoModel(model: { provider: string } | undefined | null): boolean {
  return model?.provider === "opencode-go";
}

// ═══════════════════════════════════════════════════════════════════════════════
// Suppress "Codex adapter" status from @howaboua/pi-codex-conversion
// ═══════════════════════════════════════════════════════════════════════════════

const CODX_ADAPTER_STATUS_KEYS = [
  "codex-adapter",
  "pi-codex-adapter",
  "codex-conversion",
];

function suppressCodexAdapterStatus(ctx: any) {
  if (!ctx?.hasUI) return;
  for (const key of CODX_ADAPTER_STATUS_KEYS) {
    try { ctx.ui.setStatus(key, undefined); } catch { /* key may not exist */ }
  }
}

function restoreCodexAdapterStatus(ctx: any) {
  if (!ctx?.hasUI) return;
  for (const key of CODX_ADAPTER_STATUS_KEYS) {
    try { ctx.ui.setStatus(key, undefined); } catch { /* ignore */ }
  }
}

export default function (pi: ExtensionAPI) {
  const state = { data: null as CodexUsageData | null, loading: true };

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollInFlight: Promise<void> | null = null;
  let pollQueued = false;
  let footerActive = false;
  let setupTimer: ReturnType<typeof setTimeout> | null = null;
  let tuiRef: any = null;
  let thinkingLevel = "off";

  // ── Polling ─────────────────────────────────────────────────────────────

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

  // ── Footer ──────────────────────────────────────────────────────────────

  function cancelSetupTimer() {
    if (setupTimer) { clearTimeout(setupTimer); setupTimer = null; }
  }

  function setupFooter(ctx: any) {
    if (!ctx.ui) return;
    // Belt-and-suspenders: clear any stale below-editor widget from old version
    try { ctx.ui.setWidget("pi-codex-bars", undefined); } catch { /* ignore */ }

    ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
      tuiRef = tui;
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // ── Line 1: cwd ────────────────────────────────────────────────
          let pwd = ctx.sessionManager.getCwd();
          const home = process.env.HOME || process.env.USERPROFILE;
          if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
          const branch = footerData.getGitBranch();
          if (branch) pwd = `${pwd} (${branch})`;
          const sessionName = ctx.sessionManager.getSessionName();
          if (sessionName) pwd = `${pwd} • ${sessionName}`;
          const pwdLine = truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "..."));

          // ── Line 2: stats + Codex bar + model ──────────────────────────
          let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0, totalCost = 0;
          for (const entry of ctx.sessionManager.getEntries()) {
            if (entry.type === "message" && entry.message.role === "assistant") {
              totalInput += entry.message.usage.input;
              totalOutput += entry.message.usage.output;
              totalCacheRead += entry.message.usage.cacheRead;
              totalCacheWrite += entry.message.usage.cacheWrite;
              totalCost += entry.message.usage.cost.total;
            }
          }

          const contextUsage = ctx.getContextUsage();
          const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextPercent = contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";

          const statsParts: string[] = [];
          if (totalInput) statsParts.push(`↑${formatTokens(totalInput)}`);
          if (totalOutput) statsParts.push(`↓${formatTokens(totalOutput)}`);
          if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
          if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);
          let usingSubscription = false;
          try { usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false; } catch { /* ignore */ }
          if (totalCost || usingSubscription) {
            statsParts.push(`$${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);
          }

          let contextPercentStr: string;
          const contextPercentDisplay = contextPercent === "?"
            ? `?/${formatTokens(contextWindow)}`
            : `${contextPercent}%/${formatTokens(contextWindow)}`;
          if (contextPercentValue > 90) contextPercentStr = theme.fg("error", contextPercentDisplay);
          else if (contextPercentValue > 70) contextPercentStr = theme.fg("warning", contextPercentDisplay);
          else contextPercentStr = contextPercentDisplay;
          statsParts.push(contextPercentStr);
          const statsLeft = statsParts.join(" ");

          // Model right
          const model = ctx.model;
          let rightSide = model?.id || "no-model";
          if (model?.reasoning) {
            const level = thinkingLevel || "off";
            rightSide = level === "off" ? `${rightSide} • thinking off` : `${rightSide} • ${level}`;
          }
          if (footerData.getAvailableProviderCount() > 1 && model) {
            const withProvider = `(${model.provider}) ${rightSide}`;
            if (visibleWidth(statsLeft) + 2 + visibleWidth(withProvider) <= width) {
              rightSide = withProvider;
            }
          }

          // Codex bar centered between stats and model
          const statsVisible = visibleWidth(statsLeft);
          const modelVisible = visibleWidth(rightSide);
          const minGap = 2;
          const gapTotal = width - statsVisible - modelVisible - minGap * 2;
          let barSpace = gapTotal >= 12 ? gapTotal : 0;
          const bars = barSpace > 0 ? renderFooterCodexBar(theme, state.data, state.loading, barSpace) : "";
          const barsVisible = visibleWidth(stripAnsi(bars));

          let statsLine: string;
          if (barsVisible > 0) {
            const centerVisible = barsVisible;
            const contentW = statsVisible + minGap + centerVisible + minGap + modelVisible;
            if (contentW <= width) {
              const gapLeft = Math.max(minGap, Math.floor((width - statsVisible - centerVisible - modelVisible) / 2));
              const gapRight = width - statsVisible - centerVisible - modelVisible - gapLeft;
              statsLine = statsLeft + " ".repeat(gapLeft) + bars + " ".repeat(gapRight) + rightSide;
            } else {
              const pad = " ".repeat(Math.max(minGap, width - statsVisible - modelVisible));
              statsLine = statsLeft + pad + rightSide;
            }
          } else {
            const pad = " ".repeat(Math.max(minGap, width - statsVisible - modelVisible));
            statsLine = statsLeft + pad + rightSide;
          }

          const dimStatsLeft = theme.fg("dim", statsLeft);
          const remainder = statsLine.slice(statsLeft.length);
          const statsLineStyled = dimStatsLeft + theme.fg("dim", remainder);
          const lines = [pwdLine, statsLineStyled];

          // Extension statuses
          const extensionStatuses = footerData.getExtensionStatuses();
          if (extensionStatuses.size > 0) {
            const sortedStatuses = Array.from(extensionStatuses.entries())
              .sort(([a]: any, [b]: any) => String(a).localeCompare(String(b)))
              .map(([, text]: any) => String(text).replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim());
            lines.push(truncateToWidth(sortedStatuses.join(" "), width, theme.fg("dim", "...")));
          }
          return lines;
        },
      };
    });
    footerActive = true;
  }

  function clearFooter(ctx: any) {
    try { ctx?.ui?.setFooter(undefined); } catch { /* ignore */ }
    try { ctx?.ui?.setWidget("pi-codex-bars", undefined); } catch { /* ignore */ }
    footerActive = false;
    tuiRef = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  pi.on("session_start", async (_event, _ctx) => {
    if (!isCodexModel(_ctx.model)) return;
    thinkingLevel = pi.getThinkingLevel?.() ?? "off";
    setupFooter(_ctx);
    await poll();
    tuiRef?.requestRender();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { void poll().then(() => tuiRef?.requestRender()); }, POLL_INTERVAL_MS);
  });

  pi.on("turn_start", async (_event, _ctx) => {
    if (isCodexModel(_ctx.model)) suppressCodexAdapterStatus(_ctx);
  });

  pi.on("model_select", async (_event, _ctx) => {
    if (!isCodexModel(_event.model)) {
      // Always release Codex ownership on non-Codex model.
      cancelSetupTimer();
      footerActive = false;
      tuiRef = null;
      // Only clear the footer UI if not switching to Go (pi-go-bars owns it).
      if (!isGoModel(_event.model)) {
        try { _ctx?.ui?.setFooter(undefined); } catch { /* ignore */ }
      }
      restoreCodexAdapterStatus(_ctx);
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      return;
    }
    // Defer setup so pi-go-bars clears its footer first (runs before our timer).
    cancelSetupTimer();
    setupTimer = setTimeout(() => {
      setupTimer = null;
      if (!isCodexModel(_event.model)) return;
      if (footerActive) return;
      thinkingLevel = pi.getThinkingLevel?.() ?? "off";
      setupFooter(_ctx);
      if (!state.data || state.loading) { poll(); }
      tuiRef?.requestRender();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { void poll().then(() => tuiRef?.requestRender()); }, POLL_INTERVAL_MS);
    }, 0);
  });

  pi.on("thinking_level_select", async (_event, _ctx) => {
    thinkingLevel = _event.level;
    tuiRef?.requestRender();
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    cancelSetupTimer();
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    clearFooter(_ctx);
    restoreCodexAdapterStatus(_ctx);
  });

  // ── Commands ───────────────────────────────────────────────────────────

  pi.registerCommand("codex", {
    description: "Show OpenAI Codex usage (5h window)",
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
      tuiRef?.requestRender();
    },
  });
}
