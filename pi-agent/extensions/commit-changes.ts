import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

type NotifyType = "info" | "warning" | "error";
type CommandContext = {
  cwd?: string;
  hasUI: boolean;
  sessionManager?: {
    getCwd?(): string | undefined;
  };
  ui: {
    notify(message: string, type?: NotifyType): void;
  };
};

type VcsKind = "jj" | "git";
type VcsInfo = {
  kind: VcsKind;
  root: string;
};
type ExecResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  error?: string;
};
type Preflight = {
  vcs: VcsInfo;
  cwd: string;
  clean: boolean | null;
  changedFiles: string[];
};

const SEARCH_DEPTH = 100;

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function exists(path: string): boolean {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

function findUp(cwd: string, predicate: (dir: string) => boolean): string | null {
  let dir = cwd;
  for (let depth = 0; depth <= SEARCH_DEPTH; depth++) {
    if (predicate(dir)) return dir;

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }

  return null;
}

function resolveCwd(ctx: CommandContext): string {
  return ctx.sessionManager?.getCwd?.() ?? ctx.cwd ?? process.cwd();
}

function detectVcs(cwd: string): VcsInfo | null {
  const jjRoot = findUp(cwd, (dir) => isDirectory(join(dir, ".jj")));
  if (jjRoot) return { kind: "jj", root: jjRoot };

  const gitRoot = findUp(cwd, (dir) => exists(join(dir, ".git")));
  if (gitRoot) return { kind: "git", root: gitRoot };

  return null;
}

function run(command: string, args: string[], cwd: string): ExecResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 3000,
  });

  return {
    code: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message,
  };
}

function collectPreflight(vcs: VcsInfo, cwd: string): Preflight {
  if (vcs.kind === "jj") {
    const status = run("jj", ["--no-pager", "diff", "--summary"], vcs.root);
    const changedFiles = status.stdout.trim().split(/\r?\n/).filter(Boolean);
    const clean = status.code === 0 ? changedFiles.length === 0 : null;

    return {
      vcs,
      cwd,
      clean,
      changedFiles,
    };
  }

  const status = run("git", ["status", "--short"], vcs.root);
  const changedFiles = status.stdout.trim().split(/\r?\n/).filter(Boolean);
  const clean = status.code === 0 ? changedFiles.length === 0 : null;

  return {
    vcs,
    cwd,
    clean,
    changedFiles,
  };
}

function formatChangedFiles(preflight: Preflight): string[] {
  if (preflight.changedFiles.length > 0) {
    return preflight.changedFiles.map((file) => `  ${file}`);
  }

  if (preflight.clean === null) return ["  <status unavailable>"];
  if (preflight.clean === false) return ["  <changes detected; file list unavailable>"];
  return ["  <none>"];
}

function formatPreflight(preflight: Preflight): string {
  const clean = preflight.clean === null ? "unknown" : preflight.clean ? "no" : "yes";
  return [
    `- cwd: ${preflight.cwd}`,
    `- repository root: ${preflight.vcs.root}`,
    `- vcs: ${preflight.vcs.kind === "jj" ? "Jujutsu (.jj)" : "git (.git)"}`,
    `- changes detected: ${clean}`,
    "",
    "Changed files:",
    ...formatChangedFiles(preflight),
  ].join("\n");
}

function buildPrompt(extraContext: string, preflight: Preflight): string {
  const base = [
    "Delegate this entire request to the `commit-changes` subagent.",
    "Perform no git or jj shell operations yourself.",
    "Pass the preflight and any additional context below to the subagent unchanged.",
    "Return the subagent final response verbatim.",
    "",
    "Preflight:",
    formatPreflight(preflight),
  ];

  if (extraContext.trim()) {
    base.push("", "Additional context:", extraContext.trim());
  }

  return base.join("\n");
}

function sendVisibleMessage(pi: ExtensionAPI, content: string): void {
  (pi as any).sendMessage?.({
    customType: "commit-changes",
    content,
    display: true,
  });
}

async function handleCommitChanges(
  args: string,
  ctx: CommandContext,
  pi: ExtensionAPI,
): Promise<void> {
  const cwd = resolveCwd(ctx);
  const vcs = detectVcs(cwd);

  if (!vcs) {
    const message = `No git or Jujutsu repository found from ${cwd}`;
    if (ctx.hasUI) ctx.ui.notify(message, "warning");
    sendVisibleMessage(pi, message);
    return;
  }

  const preflight = collectPreflight(vcs, cwd);
  if (preflight.clean === true) {
    const label = vcs.kind === "jj" ? "Jujutsu" : "git";
    const message = `Clean ${label} tree at ${vcs.root}`;
    if (ctx.hasUI) ctx.ui.notify(message, "info");
    sendVisibleMessage(pi, message);
    return;
  }

  const extraContext = args.trim();
  const prompt = buildPrompt(extraContext, preflight);

  try {
    pi.sendUserMessage(prompt, { deliverAs: "followUp" });
    if (ctx.hasUI) {
      ctx.ui.notify(
        extraContext
          ? `Commit subagent requested (${vcs.kind}, with context)`
          : `Commit subagent requested (${vcs.kind})`,
        "info",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (ctx.hasUI) {
      ctx.ui.notify(`Failed to send commit instruction: ${message}`, "error");
    }
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("commit-changes", {
    description:
      "Preflight VCS state, then delegate commit job to dedicated subagent",
    argumentHint: "[extra context]",
    async handler(args, ctx) {
      await handleCommitChanges(args, ctx, pi);
    },
  });

  pi.registerCommand("ci", {
    description: "Alias for /commit-changes",
    argumentHint: "[extra context]",
    async handler(args, ctx) {
      await handleCommitChanges(args, ctx, pi);
    },
  });
}
