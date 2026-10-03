/**
 * pi-codex-bars — Codex usage footer for pi
 *
 * Renders 5h and 7d OpenAI Codex usage inline in a custom 2-line footer
 * matching pi-go-bars layout. Replaces the old below-editor widget.
 *
 * Usage:
 *   Footer auto-shows when active provider is openai-codex
 *   /codex — detail overlay with full-width bars
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  Container,
  Text,
  truncateToWidth,
  visibleWidth,
  type Component,
  type Focusable,
} from "@earendil-works/pi-tui";
import { resolveJjBookmark } from "./vcs-jj-footer.ts";
import {
  parseCodexUsageHeaders,
  parseCodexUsageEvent,
  isCodexUsageEvent,
  codexWindowLabel,
  type CodexUsageData,
} from "./lib/codex-usage.ts";
export type { CodexUsageData } from "./lib/codex-usage.ts";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function colorForPercent(value: number): "success" | "warning" | "error" {
  if (value >= 90) return "error";
  if (value >= 70) return "warning";
  return "success";
}

function formatResetIn(resetsAt: number | null): string {
  if (resetsAt == null || !Number.isFinite(resetsAt)) return "";
  const remaining = Math.max(0, Math.round(resetsAt - Date.now() / 1000));
  const minutes = Math.round(remaining / 60);
  if (minutes < 90) return `resets in ~${minutes}m`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `resets in ~${hours}h`;
}

function formatResetShort(resetsAt: number | null | undefined): string {
  if (resetsAt == null || !Number.isFinite(resetsAt)) return "";
  const minutes = Math.max(0, Math.round((resetsAt - Date.now() / 1000) / 60));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d${Math.floor((minutes % 1440) / 60)}h`;
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
  resetsAt?: number | null;
}

function usageWins(data: CodexUsageData): Win[] {
  const wins: Win[] = [];
  if (data.usage?.primary) wins.push({ label: codexWindowLabel(data.usage.primary, "5h"), pct: data.usage.primary.usedPercent, resetsAt: data.usage.primary.resetsAt });
  if (data.usage?.secondary) wins.push({ label: codexWindowLabel(data.usage.secondary, "7d"), pct: data.usage.secondary.usedPercent, resetsAt: data.usage.secondary.resetsAt });
  return wins;
}

function renderBarSegment(t: any, w: Win, barSlots: number): string {
  const barCol = "dim";
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
export function renderFooterCodexBar(
  t: any,
  data: CodexUsageData | null,
  loading: boolean,
  maxWidth: number,
): string {
  if (loading) {
    return visibleWidth(t.fg("dim", "loading...")) <= maxWidth
      ? t.fg("dim", "loading...") : "";
  }
  if (!data || data.error) return "";
  const wins = usageWins(data);
  if (wins.length === 0) return "";

  const staleSuffix = data.stale ? t.fg("warning", " stale") : "";
  const staleW = visibleWidth(staleSuffix);
  const sepW = wins.length - 1;

  const minWithLabels = wins.reduce((s, w) => s + w.label.length + 1 + 4, 0) + sepW + staleW;
  const resets = wins.map((w) => formatResetShort(w.resetsAt));
  const resetW = resets.reduce((sum, reset) => sum + (reset ? reset.length + 1 : 0), 0);
  const minBare = wins.length * 4 + sepW + staleW;

  let showLabels = false;
  let showResets = false;
  let barSlots = 4;
  if (minWithLabels + resetW <= maxWidth) {
    showLabels = true;
    showResets = true;
  } else if (minWithLabels <= maxWidth) {
    showLabels = true;
  } else if (minBare <= maxWidth) {
    showLabels = false;
  } else {
    return "";
  }

  let used = 0;
  if (showLabels) used += wins.reduce((s, w) => s + w.label.length + 1, 0);
  if (showResets) used += resetW;
  used += wins.length * barSlots + sepW + staleW;
  const remaining = Math.max(0, maxWidth - used);
  barSlots = Math.min(20, barSlots + Math.floor(remaining / wins.length));

  const parts = wins.map((w, i) => {
    let seg = "";
    if (showLabels) seg += t.fg("muted", w.label + " ");
    seg += renderBarSegment(t, w, barSlots);
    if (showResets && resets[i]) seg += t.fg("dim", ` ${resets[i]}`);
    return seg;
  });
  return parts.join(" ") + staleSuffix;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detail overlay (/codex)
// ═══════════════════════════════════════════════════════════════════════════════

function buildDetailOverlay(
  theme: any,
  data: CodexUsageData | null,
  loading: boolean,
  done: () => void,
  lastResponseAt: number | null,
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
    lines.push(t.fg("dim", "No quota headers yet. Quota refreshes after model responses."));
    lines.push(t.fg("dim", "LiteLLM must forward provider quota headers."));
  } else if (data.error) {
    lines.push(t.fg("error", data.error));
  } else {
    if (data.stale && data.warning) {
      lines.push(t.fg("warning", "\u26A0 " + data.warning));
      lines.push("");
    }

    if (data.usage) {
      const wins = usageWins(data);
      const barW = 16;
      for (const w of wins) {
        const pct = clampPercent(w.pct);
        const color = colorForPercent(pct);
        const filled = Math.round((pct / 100) * barW);
        const bar =
          t.fg(color, "\u2588".repeat(Math.max(0, filled))) +
          t.fg("dim", "\u2591".repeat(Math.max(0, barW - filled)));
        const reset = w.resetsAt != null ? formatResetIn(w.resetsAt) : "";
        lines.push(
          t.fg("muted", w.label.padEnd(10)) + bar + " " + t.fg(color, `${pct}%`) +
            (reset ? "  " + t.fg("dim", reset) : ""),
        );
      }
      lines.push("");
    }
  }

  lines.push(t.fg("dim", `Last response: ${lastResponseAt === null ? "none" : new Date(lastResponseAt).toISOString()}`));
  lines.push(t.fg("dim", "Snapshot only; refreshes after model responses."));
  lines.push(t.fg("dim", "Press any key to close"));

  for (const line of lines) comp.addChild(new Text(line, 0, 0));
  return comp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Extension entry point
// ═══════════════════════════════════════════════════════════════════════════════

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
  const state = { data: null as CodexUsageData | null, loading: false };

  let lastResponseAt: number | null = null;
  let footerActive = false;
  let setupTimer: ReturnType<typeof setTimeout> | null = null;
  let tuiRef: any = null;
  let thinkingLevel = "off";

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
          const branch = resolveJjBookmark(ctx.sessionManager.getCwd()) ?? footerData.getGitBranch();
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
    state.data = null;
    lastResponseAt = null;
    if (!isCodexModel(_ctx.model)) return;
    thinkingLevel = pi.getThinkingLevel?.() ?? "off";
    setupFooter(_ctx);
    tuiRef?.requestRender();
  });

  pi.on("turn_start", async (_event, _ctx) => {
    if (isCodexModel(_ctx.model)) suppressCodexAdapterStatus(_ctx);
  });

  pi.on("provider_stream_event", (event, ctx) => {
    if (event.provider !== "openai-codex" || !isCodexModel(ctx.model) || !isCodexUsageEvent(event.data)) return;
    lastResponseAt = Date.now();
    state.data = parseCodexUsageEvent(event.data, lastResponseAt);
    tuiRef?.requestRender();
  });

  pi.on("after_provider_response", (event, ctx) => {
    state.data = null;
    lastResponseAt = null;
    if (ctx.model?.provider === "openai-codex" || ctx.model?.provider === "litellm") {
      lastResponseAt = Date.now();
      if (event.status >= 200 && event.status < 300) {
        state.data = parseCodexUsageHeaders(event.headers, lastResponseAt);
      }
    }
    tuiRef?.requestRender();
  });

  pi.on("model_select", async (_event, _ctx) => {
    state.data = null;
    lastResponseAt = null;
    tuiRef?.requestRender();
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
      tuiRef?.requestRender();
    }, 0);
  });

  pi.on("thinking_level_select", async (_event, _ctx) => {
    thinkingLevel = _event.level;
    tuiRef?.requestRender();
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    state.data = null;
    lastResponseAt = null;
    cancelSetupTimer();
    clearFooter(_ctx);
    restoreCodexAdapterStatus(_ctx);
  });

  // ── Commands ───────────────────────────────────────────────────────────

  pi.registerCommand("codex", {
    description: "Show OpenAI Codex usage (5h and 7d windows)",
    handler: async (_args, _ctx) => {
      try {
        if (_ctx.ui) {
          await _ctx.ui.custom(
            (_tui: any, theme: any, _kb: any, done: any) =>
              buildDetailOverlay(theme, state.data, state.loading, done, lastResponseAt),
          );
        }
      } catch { /* ignore */ }
      tuiRef?.requestRender();
    },
  });
}
