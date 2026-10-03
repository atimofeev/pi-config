export interface CodexUsageWindow {
  usedPercent: number;
  resetsAt: number | null;
  windowMinutes: number | null;
}

export interface CodexUsageData {
  usage: { primary: CodexUsageWindow | null; secondary: CodexUsageWindow | null } | null;
  fetchedAt?: number;
  error?: string;
  stale?: boolean;
  warning?: string;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function metadataInteger(value: unknown): number | null {
  const number = numeric(value);
  return number !== null && Number.isSafeInteger(number) ? number : null;
}

function validateWindow(used: unknown, minutes: unknown, reset: unknown): CodexUsageWindow | null {
  const usedPercent = numeric(used);
  if (usedPercent === null) return null;
  const duration = metadataInteger(minutes);
  const resetsAt = metadataInteger(reset);
  if (usedPercent === 0 && (duration === null || duration === 0) && resetsAt === null) return null;
  return { usedPercent, resetsAt, windowMinutes: duration !== null && duration > 0 ? duration : null };
}

function snapshot(primary: CodexUsageWindow | null, secondary: CodexUsageWindow | null, now: number): CodexUsageData | null {
  if (!secondary && primary?.windowMinutes === 10080) {
    secondary = primary;
    primary = null;
  }
  return primary || secondary ? { usage: { primary, secondary }, fetchedAt: now } : null;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function isCodexUsageEvent(data: unknown): boolean {
  const event = object(data);
  if (event?.type !== "codex.rate_limits") return false;
  const name = event.metered_limit_name ?? event.limit_name;
  return name == null || (typeof name === "string" && name.trim().toLowerCase().replace(/-/g, "_") === "codex");
}

export function parseCodexUsageEvent(data: unknown, now = Date.now()): CodexUsageData | null {
  if (!isCodexUsageEvent(data)) return null;
  const details = object(object(data)?.rate_limits);
  function window(value: unknown): CodexUsageWindow | null {
    const raw = object(value);
    if (!raw || typeof raw.used_percent !== "number") return null;
    return validateWindow(raw.used_percent, typeof raw.window_minutes === "number" ? raw.window_minutes : null,
      typeof raw.reset_at === "number" ? raw.reset_at : null);
  }
  return snapshot(window(details?.primary), window(details?.secondary), now);
}

export function parseCodexUsageHeaders(
  headers: Record<string, unknown> | undefined,
  now = Date.now(),
): CodexUsageData | null {
  const normalized = new Map(Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
  function window(name: string): CodexUsageWindow | null {
    // Parse each family together; never combine metadata from different sources.
    for (const prefix of ["x-codex-", "llm_provider-x-codex-"]) {
      const base = `${prefix}${name}-`;
      const parsed = validateWindow(normalized.get(`${base}used-percent`), normalized.get(`${base}window-minutes`), normalized.get(`${base}reset-at`));
      if (parsed) return parsed;
    }
    return null;
  }
  return snapshot(window("primary"), window("secondary"), now);
}

export function codexWindowLabel(window: CodexUsageWindow, fallback: string): string {
  const minutes = window.windowMinutes;
  if (minutes === null) return fallback;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}
