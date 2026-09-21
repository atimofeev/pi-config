import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
  fetchWithCache as fetchCodexUsage,
  renderFooterCodexBar,
  type CodexUsageData,
} from "./pi-codex-bars.ts";
import { resolveJjBookmark } from "./jj-footer.ts";
import {
  fetchWithCache as fetchGoUsage,
  formatDuration,
  type GoUsageData,
} from "../npm/node_modules/pi-go-bars/extensions/pi-go-bars/core.ts";

const MAX_VALUE_LENGTH = 96;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const GO_POLL_INTERVAL_MS = 30_000;

type Headers = Record<string, unknown> | undefined;
type UsageKind = "codex" | "go" | null;

interface BackendState {
  servedGroup?: string;
  servedModel?: string;
  apiBase?: string;
  fallbacks: number;
  usageKind: UsageKind;
}

interface UsageState<T> {
  data: T | null;
  loading: boolean;
}

function header(headers: Headers, name: string): string | undefined {
  const value = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  if (value === undefined || value === null) return undefined;

  const sanitized = String(value).replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
  if (!sanitized) return undefined;
  return sanitized.length > MAX_VALUE_LENGTH ? `${sanitized.slice(0, MAX_VALUE_LENGTH - 3)}...` : sanitized;
}

function fallbackCount(headers: Headers): number {
  const value = header(headers, "x-litellm-attempted-fallbacks");
  if (!value || !/^\d+$/.test(value)) return 0;

  const count = Number(value);
  return Number.isSafeInteger(count) ? count : 0;
}

function classifyUsage(
  servedGroup: string | undefined,
  servedModel: string | undefined,
  apiBase: string | undefined,
): UsageKind {
  if (apiBase?.includes("opencode.ai/zen/go/") || (servedGroup && /-opencode$/.test(servedGroup))) return "go";
  if (servedModel?.startsWith("chatgpt/")) return "codex";
  return null;
}

function compactBackend(state: BackendState): string | undefined {
  if (!state.servedGroup && !state.servedModel) return undefined;

  const model = state.servedModel?.replace(/^[^/]+\//, "");
  const identity = model ?? state.servedGroup;
  return state.fallbacks > 0 ? `${identity}↪${state.fallbacks}` : identity;
}

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function fgToBgAnsi(fgAnsi: string): string {
  const indexed = fgAnsi.match(/\x1b\[38;5;(\d+)m/);
  if (indexed) return `\x1b[48;5;${indexed[1]}m`;
  const rgb = fgAnsi.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (rgb) return `\x1b[48;2;${rgb[1]};${rgb[2]};${rgb[3]}m`;
  return fgAnsi.replace("[38", "[48");
}

function renderPercentBar(theme: any, value: number, slots: number): string {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const label = `${percent}%`;
  if (percent === 0) return theme.fg("dim", label + "░".repeat(Math.max(0, slots - label.length)));

  const filled = Math.max(1, Math.round((percent / 100) * slots));
  const before = Math.max(0, Math.min(filled, Math.floor((filled - label.length) / 2)));
  const after = Math.max(0, filled - before - label.length);
  const empty = Math.max(0, slots - before - label.length - after);
  const background = fgToBgAnsi(theme.getFgAnsi("dim"));
  return theme.fg("dim", "█".repeat(before)) +
    background + theme.bold(label) + "\x1b[39m\x1b[49m" +
    theme.fg("dim", "█".repeat(after)) +
    theme.fg("dim", "░".repeat(empty));
}

function renderGoBars(theme: any, data: GoUsageData | null, loading: boolean, maxWidth: number): string {
  if (loading || !data || data.error) return "";

  const elapsed = data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt) / 1000) : 0;
  const windows = [
    data.rolling && { label: "R", percent: data.rolling.usagePercent, reset: data.rolling.resetInSec - elapsed },
    data.weekly && { label: "W", percent: data.weekly.usagePercent, reset: data.weekly.resetInSec - elapsed },
    data.monthly && { label: "M", percent: data.monthly.usagePercent, reset: data.monthly.resetInSec - elapsed },
  ].filter((window): window is { label: string; percent: number; reset: number } => Boolean(window));
  if (windows.length === 0) return "";

  const stale = data.stale ? " stale" : "";
  const bareWidth = 2 + windows.length * 5 + stale.length;
  if (bareWidth > maxWidth) return "";

  const resetLabels = windows.map((window) => window.reset > 0 ? formatDuration(window.reset) : "");
  const labelsWidth = windows.reduce((width, window) => width + window.label.length + 1, 0);
  const resetsWidth = resetLabels.reduce((width, reset) => width + (reset ? reset.length + 1 : 0), 0);
  const showLabels = bareWidth + labelsWidth <= maxWidth;
  const showResets = showLabels && bareWidth + labelsWidth + resetsWidth <= maxWidth;
  const fixedWidth = 2 + stale.length + windows.reduce((width, window, index) => {
    return width + 1 + (showLabels ? window.label.length + 1 : 0) +
      (showResets && resetLabels[index] ? resetLabels[index].length + 1 : 0);
  }, 0);
  const slots = Math.min(20, Math.max(4, Math.floor((maxWidth - fixedWidth) / windows.length)));

  const parts = [theme.fg("dim", "Go")];
  windows.forEach((window, index) => {
    parts.push(" ");
    if (showLabels) parts.push(theme.fg("muted", `${window.label} `));
    parts.push(renderPercentBar(theme, window.percent, slots));
    if (showResets && resetLabels[index]) parts.push(theme.fg("dim", ` ${resetLabels[index]}`));
  });
  if (stale) parts.push(theme.fg("warning", stale));
  return parts.join("");
}

function isLiteLLM(model: { provider?: string } | undefined | null): boolean {
  return model?.provider === "litellm";
}

export default function (pi: ExtensionAPI) {
  const backend: BackendState = { fallbacks: 0, usageKind: null };
  const codexUsage: UsageState<CodexUsageData> = { data: null, loading: false };
  const goUsage: UsageState<GoUsageData> = { data: null, loading: false };
  let footerActive = false;
  let thinkingLevel = "off";
  let tuiRef: any = null;
  let setupTimer: ReturnType<typeof setTimeout> | null = null;
  let usagePollTimer: ReturnType<typeof setInterval> | null = null;
  let codexPollInFlight: Promise<void> | null = null;
  let goPollInFlight: Promise<void> | null = null;

  function clearBackend(): void {
    backend.servedGroup = undefined;
    backend.servedModel = undefined;
    backend.apiBase = undefined;
    backend.fallbacks = 0;
    backend.usageKind = null;
  }

  async function pollCodexUsage(): Promise<void> {
    if (codexPollInFlight) return codexPollInFlight;
    codexUsage.loading = !codexUsage.data;
    codexPollInFlight = fetchCodexUsage()
      .then((data) => { codexUsage.data = data; })
      .finally(() => {
        codexUsage.loading = false;
        codexPollInFlight = null;
        tuiRef?.requestRender();
      });
    return codexPollInFlight;
  }

  async function pollGoUsage(): Promise<void> {
    if (goPollInFlight) return goPollInFlight;
    goUsage.loading = !goUsage.data;
    goPollInFlight = fetchGoUsage()
      .then((data) => { goUsage.data = data; })
      .finally(() => {
        goUsage.loading = false;
        goPollInFlight = null;
        tuiRef?.requestRender();
      });
    return goPollInFlight;
  }

  function updateUsagePolling(): void {
    if (usagePollTimer) clearInterval(usagePollTimer);
    usagePollTimer = null;

    const poll = backend.usageKind === "codex"
      ? pollCodexUsage
      : backend.usageKind === "go"
        ? pollGoUsage
        : null;
    if (!poll) return;

    void poll();
    usagePollTimer = setInterval(() => { void poll(); }, GO_POLL_INTERVAL_MS);
  }

  function cancelSetupTimer(): void {
    if (!setupTimer) return;
    clearTimeout(setupTimer);
    setupTimer = null;
  }

  function setupFooter(ctx: any): void {
    if (!ctx.ui || footerActive) return;
    ctx.ui.setFooter((tui: any, theme: any, footerData: any) => {
      tuiRef = tui;
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose() {
          unsubscribe();
          footerActive = false;
          tuiRef = null;
        },
        invalidate() {},
        render(width: number): string[] {
          let cwd = ctx.sessionManager.getCwd();
          const home = process.env.HOME || process.env.USERPROFILE;
          if (home && cwd.startsWith(home)) cwd = `~${cwd.slice(home.length)}`;
          const branch = resolveJjBookmark(ctx.sessionManager.getCwd()) ?? footerData.getGitBranch();
          if (branch) cwd = `${cwd} (${branch})`;
          const sessionName = ctx.sessionManager.getSessionName();
          if (sessionName) cwd = `${cwd} • ${sessionName}`;
          const cwdLine = truncateToWidth(theme.fg("dim", cwd), width, theme.fg("dim", "..."));

          let totalInput = 0;
          let totalOutput = 0;
          let totalCacheRead = 0;
          let totalCacheWrite = 0;
          let totalCost = 0;
          for (const entry of ctx.sessionManager.getEntries()) {
            if (entry.type !== "message" || entry.message.role !== "assistant") continue;
            totalInput += entry.message.usage.input;
            totalOutput += entry.message.usage.output;
            totalCacheRead += entry.message.usage.cacheRead;
            totalCacheWrite += entry.message.usage.cacheWrite;
            totalCost += entry.message.usage.cost.total;
          }

          const contextUsage = ctx.getContextUsage();
          const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextPercent = contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";
          const stats = [];
          if (totalInput) stats.push(`↑${formatTokens(totalInput)}`);
          if (totalOutput) stats.push(`↓${formatTokens(totalOutput)}`);
          if (totalCacheRead) stats.push(`R${formatTokens(totalCacheRead)}`);
          if (totalCacheWrite) stats.push(`W${formatTokens(totalCacheWrite)}`);
          if (totalCost) stats.push(`$${totalCost.toFixed(3)}`);
          const contextDisplay = contextPercent === "?"
            ? `?/${formatTokens(contextWindow)}`
            : `${contextPercent}%/${formatTokens(contextWindow)}`;
          stats.push(contextPercentValue > 90
            ? theme.fg("error", contextDisplay)
            : contextPercentValue > 70
              ? theme.fg("warning", contextDisplay)
              : contextDisplay);
          const statsLeft = stats.join(" ");

          const model = ctx.model;
          const served = compactBackend(backend);
          let rightSide = served && served !== model?.id ? `${model?.id}→${served}` : (model?.id ?? "no-model");
          if (model?.reasoning) {
            rightSide += thinkingLevel === "off" ? " • thinking off" : ` • ${thinkingLevel}`;
          }
          if (footerData.getAvailableProviderCount() > 1 && model) {
            const withProvider = `(${model.provider}) ${rightSide}`;
            if (visibleWidth(statsLeft) + 2 + visibleWidth(withProvider) <= width) rightSide = withProvider;
          }

          const statsWidth = visibleWidth(statsLeft);
          const modelWidth = visibleWidth(rightSide);
          const centerWidth = Math.max(0, width - statsWidth - modelWidth - 4);
          const center = backend.usageKind === "codex"
            ? renderFooterCodexBar(theme, codexUsage.data, codexUsage.loading, centerWidth)
            : backend.usageKind === "go"
              ? renderGoBars(theme, goUsage.data, goUsage.loading, centerWidth)
              : "";
          const renderedCenterWidth = visibleWidth(stripAnsi(center));
          const leftGap = renderedCenterWidth > 0
            ? Math.max(2, Math.floor((width - statsWidth - renderedCenterWidth - modelWidth) / 2))
            : 2;
          const rightGap = Math.max(2, width - statsWidth - renderedCenterWidth - modelWidth - leftGap);
          const statsLine = statsLeft + " ".repeat(leftGap) + center + " ".repeat(rightGap) + rightSide;
          return [cwdLine, truncateToWidth(theme.fg("dim", statsLine), width, theme.fg("dim", "..."))];
        },
      };
    });
    footerActive = true;
  }

  function clearFooter(ctx: any): void {
    if (!footerActive) return;
    ctx.ui.setFooter(undefined);
    footerActive = false;
    tuiRef = null;
  }

  pi.on("session_start", (_event, ctx) => {
    if (!isLiteLLM(ctx.model)) return;
    thinkingLevel = pi.getThinkingLevel?.() ?? "off";
    cancelSetupTimer();
    setupTimer = setTimeout(() => {
      setupTimer = null;
      if (!isLiteLLM(ctx.model)) return;
      setupFooter(ctx);
      tuiRef?.requestRender();
    }, 0);
  });

  pi.on("after_provider_response", (event, ctx) => {
    if (!isLiteLLM(ctx.model)) return;
    if (event.status < 200 || event.status >= 300) {
      clearBackend();
    } else {
      backend.servedGroup = header(event.headers, "x-litellm-model-group");
      backend.servedModel = header(event.headers, "x-litellm-model-name");
      backend.apiBase = header(event.headers, "x-litellm-model-api-base");
      backend.fallbacks = fallbackCount(event.headers);
      backend.usageKind = classifyUsage(backend.servedGroup, backend.servedModel, backend.apiBase);
    }
    updateUsagePolling();
    tuiRef?.requestRender();
  });

  pi.on("model_select", (event, ctx) => {
    cancelSetupTimer();
    clearBackend();
    if (usagePollTimer) clearInterval(usagePollTimer);
    usagePollTimer = null;
    if (!isLiteLLM(event.model)) {
      clearFooter(ctx);
      return;
    }

    // Other usage-bar extensions clear their footer for non-native providers.
    // Reclaim the single footer slot after every model-select handler runs.
    setupTimer = setTimeout(() => {
      setupTimer = null;
      if (!isLiteLLM(ctx.model)) return;
      thinkingLevel = pi.getThinkingLevel?.() ?? "off";
      setupFooter(ctx);
      tuiRef?.requestRender();
    }, 0);
  });

  pi.on("thinking_level_select", (event) => {
    thinkingLevel = event.level;
    tuiRef?.requestRender();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    cancelSetupTimer();
    if (usagePollTimer) clearInterval(usagePollTimer);
    usagePollTimer = null;
    clearFooter(ctx);
  });
}
