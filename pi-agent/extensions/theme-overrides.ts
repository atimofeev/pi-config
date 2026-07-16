import { Theme, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type ColorValue = string | number;

interface ThemeJson {
  name: string;
  vars?: Record<string, string | number>;
  colors: Record<string, string | number>;
}

interface Settings {
  theme?: string;
  themeOverrides?: Record<string, ColorValue>;
}

function isOverrideMap(value: unknown): value is Record<string, ColorValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (typeof v !== "string" && typeof v !== "number") return false;
  }
  return true;
}

const SETTINGS_PATH = path.join(os.homedir(), ".pi", "agent", "settings.json");

function readSettings(): Settings | null {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as Settings;
  } catch {
    return null;
  }
}

function readThemeJson(themePath: string): ThemeJson | null {
  try {
    const raw = JSON.parse(fs.readFileSync(themePath, "utf-8"));
    if (!raw || typeof raw !== "object") return null;
    if (typeof raw.name !== "string") return null;
    if (!raw.colors || typeof raw.colors !== "object" || Array.isArray(raw.colors)) return null;
    return raw as ThemeJson;
  } catch {
    return null;
  }
}

const BG_COLOR_KEYS = new Set([
  "selectedBg",
  "userMessageBg",
  "customMessageBg",
  "toolPendingBg",
  "toolSuccessBg",
  "toolErrorBg",
]);

function resolveVarRefs(
  value: string | number,
  vars: Record<string, string | number>,
  visited: Set<string> = new Set(),
): string | number {
  if (typeof value === "number" || value === "" || (typeof value === "string" && value.startsWith("#"))) {
    return value;
  }
  if (typeof value !== "string") return value;
  if (visited.has(value)) throw new Error(`Circular var ref: ${value}`);
  if (!(value in vars)) throw new Error(`Unknown var: ${value}`);
  visited.add(value);
  return resolveVarRefs(vars[value], vars, visited);
}

function resolveColors(
  colors: Record<string, string | number>,
  vars: Record<string, string | number>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(colors)) {
    out[k] = resolveVarRefs(v, vars);
  }
  return out;
}

function buildTheme(
  themeJson: ThemeJson,
  mode: "truecolor" | "256color",
  sourcePath?: string,
): Theme {
  const resolved = resolveColors(themeJson.colors, themeJson.vars ?? {});
  const fgColors: Record<string, string | number> = {};
  const bgColors: Record<string, string | number> = {};

  for (const [k, v] of Object.entries(resolved)) {
    if (BG_COLOR_KEYS.has(k)) bgColors[k] = v;
    else fgColors[k] = v;
  }

  const missingBgKeys = [...BG_COLOR_KEYS].filter((k) => !(k in resolved));
  if (missingBgKeys.length > 0) {
    throw new Error(
      `Missing required background color keys: ${missingBgKeys.join(", ")}`,
    );
  }
  if (Object.keys(fgColors).length === 0) {
    throw new Error("No foreground colors resolved; theme is invalid");
  }

  // Theme constructor owns full token schema validation; casts here
  // are for resolved values already validated above.
  return new Theme(
    fgColors as any,
    bgColors as any,
    mode,
    { name: themeJson.name, sourcePath },
  );
}

function applyThemeOverrides(ctx: any): void {
  if (ctx.signal?.aborted) return;

  const settings = readSettings();
  if (!settings) return;

  const overrides = settings.themeOverrides;
  if (!isOverrideMap(overrides)) return;

  const overrideKeys = Object.keys(overrides);
  if (overrideKeys.length === 0) return;

  const baseThemeName = settings.theme;
  if (!baseThemeName || typeof baseThemeName !== "string") return;

  let themeJson: ThemeJson | null = null;
  let sourcePath: string | undefined;

  const baseTheme = ctx.ui.getTheme(baseThemeName);
  if (baseTheme?.sourcePath) {
    const themePath = baseTheme.sourcePath;
    sourcePath = themePath;
    themeJson = readThemeJson(themePath);
    if (!themeJson) {
      ctx.ui.notify(
        `theme-overrides: failed to parse ${sourcePath}`,
        "warning",
      );
      return;
    }
  } else {
    const allThemes: { name: string; path: string | undefined }[] = ctx.ui.getAllThemes();
    const info = allThemes.find((t) => t.name === baseThemeName);
    if (info?.path) {
      themeJson = readThemeJson(info.path);
      if (!themeJson) {
        ctx.ui.notify(
          `theme-overrides: failed to parse ${info.path}`,
          "warning",
        );
        return;
      }
      sourcePath = info.path;
    } else {
      ctx.ui.notify(
        `theme-overrides: no source for theme "${baseThemeName}"`,
        "warning",
      );
      return;
    }
  }

  const baseColors = themeJson.colors;
  const unknownKeys = overrideKeys.filter((k) => !(k in baseColors));
  if (unknownKeys.length > 0) {
    ctx.ui.notify(
      `theme-overrides: unknown keys skipped: ${unknownKeys.join(", ")}`,
      "warning",
    );
  }

  const mergedColors = { ...baseColors };
  for (const key of overrideKeys) {
    if (key in baseColors) {
      mergedColors[key] = overrides[key];
    }
  }

  const mergedThemeJson: ThemeJson = {
    ...themeJson,
    colors: mergedColors,
  };

  const colorMode: "truecolor" | "256color" =
    (ctx.ui.theme as any)?.getColorMode?.() ?? "truecolor";

  try {
    const themeInstance = buildTheme(mergedThemeJson, colorMode, sourcePath);
    const result = ctx.ui.setTheme(themeInstance);
    if (!result.success) {
      ctx.ui.notify(
        `theme-overrides: failed to set theme "${themeInstance.name}"`,
        "error",
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.ui.notify(`theme-overrides: ${msg}`, "error");
  }
}

export default function (pi: ExtensionAPI) {

  pi.on("session_start", (event, ctx) => {
    if (event.reason !== "startup" && event.reason !== "reload") return;
    if (!ctx.hasUI) return;

    const delayMs = event.reason === "reload" ? 1000 : 0;
    setTimeout(() => applyThemeOverrides(ctx), delayMs);
  });
}
