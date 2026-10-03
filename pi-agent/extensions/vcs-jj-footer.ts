import { FooterComponent } from "@earendil-works/pi-coding-agent";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const SEARCH_DEPTH = 100;
const CACHE_TTL_MS = 1500;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

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

export function resolveJjBookmark(cwd: string | undefined): string | null {
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

// FooterDataProvider is not exported, but the runtime keeps one instance and
// hands it to every custom footer (pi-go-bars, pi-codex-bars, ...). Reach it
// through a FooterComponent instance and patch getGitBranch on its prototype,
// so all footers show the jj bookmark instead of git's "(detached)".
function patchFooterData(instance: any): void {
  const proto = instance?.footerData?.constructor?.prototype;
  if (!proto || typeof proto.getGitBranch !== "function" || proto.__jjPatched) return;

  const orig = proto.getGitBranch;
  proto.getGitBranch = function () {
    const jj = resolveJjBookmark(this?.cwd);
    if (jj) return jj;
    return orig.call(this);
  };
  proto.__jjPatched = true;
}

function patchFooterComponent(): void {
  const proto = FooterComponent.prototype as any;
  if (proto.__jjFooterPatched) return;

  for (const method of ["setSession", "setAutoCompactEnabled", "invalidate", "render"] as const) {
    const original = proto[method];
    if (typeof original !== "function") continue;
    proto[method] = function (...args: unknown[]) {
      patchFooterData(this);
      return original.apply(this, args);
    };
  }

  proto.__jjFooterPatched = true;
}

patchFooterComponent();

export default function () {}
