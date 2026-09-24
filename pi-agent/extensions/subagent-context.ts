import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SEARCH_DEPTH = 100;
const MAX_FILE_BYTES = 16_000;
const MAX_CONTEXT_BYTES = 32_000;
const MAX_VCS_OUTPUT = 2_000;
const CACHE_TTL_MS = 5_000;

type Vcs = { kind: "jj" | "git"; root: string };
type CacheEntry = { expiresAt: number; context: string };

const cache = new Map<string, CacheEntry>();

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function findUp(cwd: string, marker: string): string | null {
  let dir = resolve(cwd);
  for (let depth = 0; depth <= SEARCH_DEPTH; depth++) {
    if (isDirectory(join(dir, marker)) || isFile(join(dir, marker))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function findVcs(cwd: string): Vcs | null {
  const jjRoot = findUp(cwd, ".jj");
  if (jjRoot) return { kind: "jj", root: jjRoot };

  const gitRoot = findUp(cwd, ".git");
  return gitRoot ? { kind: "git", root: gitRoot } : null;
}

function collectInstructionFiles(cwd: string): string[] {
  const paths: string[] = [];
  const global = join(homedir(), ".pi", "agent", "AGENTS.md");
  if (isFile(global)) paths.push(global);

  const ancestors: string[] = [];
  let dir = resolve(cwd);
  for (let depth = 0; depth <= SEARCH_DEPTH; depth++) {
    ancestors.push(dir);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const ancestor of ancestors.reverse()) {
    const override = join(ancestor, "AGENTS.override.md");
    const agents = join(ancestor, "AGENTS.md");
    if (isFile(override)) paths.push(override);
    else if (isFile(agents)) paths.push(agents);
  }

  return [...new Set(paths)];
}

function readInstructionFiles(cwd: string): string[] {
  const sections: string[] = [];
  let remaining = MAX_CONTEXT_BYTES;

  for (const path of collectInstructionFiles(cwd)) {
    let content: string;
    try {
      const size = statSync(path).size;
      if (size > MAX_FILE_BYTES || size > remaining) {
        sections.push(`[omitted: ${path} exceeds runtime context limit]`);
        continue;
      }
      content = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    sections.push(`<file path="${path}">\n${content}\n</file>`);
    remaining -= Buffer.byteLength(content, "utf8");
  }

  return sections;
}

function vcsSummary(vcs: Vcs): string {
  const args = vcs.kind === "jj"
    ? ["--no-pager", "status"]
    : ["--no-pager", "status", "--short", "--branch"];

  const result = spawnSync(vcs.kind, args, {
    cwd: vcs.root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 750,
    maxBuffer: MAX_VCS_OUTPUT,
  });

  if (result.status !== 0 || !result.stdout) return "status unavailable";
  return result.stdout.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").trim().slice(0, MAX_VCS_OUTPUT);
}

function buildContext(cwd: string): string {
  const files = readInstructionFiles(cwd);
  const vcs = findVcs(cwd);
  const vcsBlock = vcs
    ? `<vcs kind="${vcs.kind}" root="${vcs.root}">\n${vcsSummary(vcs)}\n</vcs>`
    : "<vcs>none detected</vcs>";

  return [
    "<runtime_context>",
    "This is runtime-provided repository context, not new user input. Follow repository instructions below.",
    `<working_directory>${resolve(cwd)}</working_directory>`,
    vcsBlock,
    files.length > 0 ? `<repository_instructions>\n${files.join("\n\n")}\n</repository_instructions>` : "<repository_instructions>none found</repository_instructions>",
    "</runtime_context>",
  ].join("\n");
}

function isReplaceModeSubagent(systemPrompt: string): boolean {
  return /^<active_agent name="[^"]+"\/>\n/.test(systemPrompt);
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    if (!isReplaceModeSubagent(event.systemPrompt)) return;

    const cwd = event.systemPromptOptions.cwd ?? process.cwd();
    const cached = cache.get(cwd);
    const now = Date.now();
    const context = cached && cached.expiresAt > now
      ? cached.context
      : buildContext(cwd);

    cache.set(cwd, { context, expiresAt: now + CACHE_TTL_MS });
    event.systemPromptOptions.sections.subagent_runtime_context = context;
  });
}
