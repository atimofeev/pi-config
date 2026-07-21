import { FooterComponent, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const SEARCH_DEPTH = 100;
const CACHE_TTL_MS = 1500;
const REFRESH_MS = 2000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const patchedUis = new WeakSet<object>();

function findJjRoot(cwd: string, maxDepth = SEARCH_DEPTH): string | null {
  if (!cwd) return null;

  let dir = cwd;
  for (let depth = 0; depth <= maxDepth; depth++) {
    const jjPath = join(dir, ".jj");
    try {
      if (existsSync(jjPath) && statSync(jjPath).isDirectory()) return dir;
    } catch {
      return null;
    }

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }

  return null;
}

function resolveJjBookmark(cwd: string | undefined): string | null {
  if (!cwd) return null;

  const root = findJjRoot(cwd);
  if (!root) return null;

  const now = Date.now();
  const cached = cache.get(root);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = readJjBookmark(root);
  cache.set(root, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

function readJjBookmark(root: string): string | null {
  const result = spawnSync(
    "jj",
    [
      "--ignore-working-copy",
      "--no-pager",
      "log",
      "-r",
      `ancestors(@, ${SEARCH_DEPTH + 1})`,
      "--no-graph",
      "--template",
      'self.local_bookmarks().map(|b| b.name()).join(",") ++ "\\n"',
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 750,
    },
  );

  if (result.status !== 0 || !result.stdout) return null;

  const lines = result.stdout.split(/\r?\n/);
  for (let distance = 0; distance < lines.length; distance++) {
    const names = lines[distance]
      ?.split(",")
      .map((name) => name.trim())
      .filter(Boolean) ?? [];

    if (names.length === 0) continue;
    return names.map((name) => (distance === 0 ? name : `${name}⇡${distance}`)).join(",");
  }

  return null;
}

function replaceBranch(line: string, branch: string): string {
  const start = line.lastIndexOf("(");
  const end = start >= 0 ? line.indexOf(")", start) : -1;
  if (start >= 0 && end > start) {
    return `${line.slice(0, start)}(${branch})${line.slice(end + 1)}`;
  }

  return `${line} (${branch})`;
}

function patchFooterLines(lines: string[], cwd: string | undefined): string[] {
  const branch = resolveJjBookmark(cwd);
  if (!branch || lines.length === 0) return lines;
  return [replaceBranch(lines[0], branch), ...lines.slice(1)];
}

function cwdFromContext(ctx: any): string | undefined {
  return ctx?.sessionManager?.getCwd?.() ?? ctx?.cwd;
}

function wrapFooterData(footerData: any, getCwd: () => string | undefined): any {
  return new Proxy(footerData, {
    get(target, prop, receiver) {
      if (prop === "getGitBranch") {
        return () => resolveJjBookmark(getCwd()) ?? target.getGitBranch();
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function wrapFooterComponent(component: any, tui: any, getCwd: () => string | undefined): any {
  const refresh = setInterval(() => {
    if (findJjRoot(getCwd() ?? "")) tui?.requestRender?.();
  }, REFRESH_MS);
  refresh.unref?.();

  return {
    invalidate() {
      component.invalidate?.();
    },
    render(width: number) {
      return patchFooterLines(component.render(width), getCwd());
    },
    dispose() {
      clearInterval(refresh);
      component.dispose?.();
    },
  };
}

function patchUi(ctx: any): void {
  const ui = ctx?.ui;
  if (!ui || patchedUis.has(ui)) return;
  patchedUis.add(ui);

  const originalSetFooter = ui.setFooter.bind(ui);
  ui.setFooter = (factory: any) => {
    if (!factory) return originalSetFooter(factory);

    return originalSetFooter((tui: any, theme: any, footerData: any) => {
      const getCwd = () => cwdFromContext(ctx);
      const wrappedFooterData = wrapFooterData(footerData, getCwd);
      const component = factory(tui, theme, wrappedFooterData);
      return wrapFooterComponent(component, tui, getCwd);
    });
  };
}

function patchBuiltInFooter(): void {
  const proto = FooterComponent.prototype as any;
  if (proto.__jjFooterPatched) return;

  const originalRender = proto.render;
  proto.render = function renderWithJjBranch(width: number) {
    const lines = originalRender.call(this, width);
    const cwd = this?.session?.sessionManager?.getCwd?.();
    return patchFooterLines(lines, cwd);
  };

  proto.__jjFooterPatched = true;
}

patchBuiltInFooter();

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => patchUi(ctx));
  pi.on("model_select", (_event, ctx) => patchUi(ctx));
  pi.on("turn_start", (_event, ctx) => patchUi(ctx));
}
