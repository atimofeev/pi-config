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
  outputs: Array<[string, ExecResult]>;
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

function commandLine(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

function collectPreflight(vcs: VcsInfo, cwd: string): Preflight {
  if (vcs.kind === "jj") {
    const statusArgs = ["--no-pager", "st"];
    const statArgs = ["--no-pager", "diff", "--stat"];
    const status = run("jj", statusArgs, vcs.root);
    const diffStat = run("jj", statArgs, vcs.root);
    const clean = status.code === 0
      ? status.stdout.includes("The working copy has no changes.")
      : null;

    return {
      vcs,
      cwd,
      clean,
      outputs: [
        [commandLine("jj", statusArgs), status],
        [commandLine("jj", statArgs), diffStat],
      ],
    };
  }

  const statusArgs = ["status", "--porcelain=v1"];
  const stagedArgs = ["diff", "--cached", "--stat"];
  const unstagedArgs = ["diff", "--stat"];
  const status = run("git", statusArgs, vcs.root);
  const stagedStat = run("git", stagedArgs, vcs.root);
  const unstagedStat = run("git", unstagedArgs, vcs.root);
  const clean = status.code === 0 ? status.stdout.trim().length === 0 : null;

  return {
    vcs,
    cwd,
    clean,
    outputs: [
      [commandLine("git", statusArgs), status],
      [commandLine("git", stagedArgs), stagedStat],
      [commandLine("git", unstagedArgs), unstagedStat],
    ],
  };
}

function formatOutput([label, result]: [string, ExecResult]): string {
  const status = result.error ? `error=${result.error}` : `exit=${result.code}`;
  const stdout = result.stdout.trimEnd() || "<empty>";
  const stderr = result.stderr.trimEnd();
  return [`$ ${label}`, status, stdout, stderr ? `stderr:\n${stderr}` : ""]
    .filter(Boolean)
    .join("\n");
}

function formatPreflight(preflight: Preflight): string {
  const clean = preflight.clean === null ? "unknown" : preflight.clean ? "no" : "yes";
  return [
    `- cwd: ${preflight.cwd}`,
    `- repository root: ${preflight.vcs.root}`,
    `- vcs: ${preflight.vcs.kind === "jj" ? "Jujutsu (.jj)" : "git (.git)"}`,
    `- changes detected: ${clean}`,
    "",
    "Command output:",
    "```text",
    preflight.outputs.map(formatOutput).join("\n\n"),
    "```",
  ].join("\n");
}

function vcsRules(kind: VcsKind): string[] {
  if (kind === "jj") {
    return [
      "- VCS already detected as Jujutsu. Use only `jj` commands with `--no-pager`; do not run raw git commands.",
      "- Jujutsu has no staged/unstaged split. Inspect `jj st` and `jj diff --git` before committing.",
      "- Current working copy is commit `@`. If changes are one logical group, set `jj desc -m \"type(scope): description\"`, then `jj new` to finalize.",
      "- If multiple logical groups cannot be split safely without interactive commands, ask before committing.",
    ];
  }

  return [
    "- VCS already detected as git. Use git commands normally.",
    "- Inspect `git status --short`, staged diff, and unstaged diff before committing.",
    "- Preserve unrelated pre-staged work unless it belongs to current commit group.",
    "- Stage only files or hunks needed for each commit group.",
  ];
}

function buildPrompt(extraContext: string, preflight: Preflight): string {
  const base = [
    "Commit current changes granularly using Conventional Commits.",
    "",
    "Slash-command preflight already detected VCS and checked clean state. Do not repeat VCS detection unless command output conflicts.",
    "",
    "Preflight:",
    formatPreflight(preflight),
    "",
    "Rules:",
    ...vcsRules(preflight.vcs.kind),
    "- Group related changes into logical commits.",
    "- Each commit message must use Conventional Commits format: type(scope): description",
    "- Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build",
    "- Keep commits atomic: one logical change per commit.",
    "- Use clear, imperative descriptions: 'add X' not 'added X'.",
    "- Do not commit secrets, local env files, logs, build outputs, caches, or generated artifacts unless explicitly requested.",
    "- Do NOT push — only commit locally.",
    "- If changes are ambiguous or unsafe, ask before committing.",
    "- After committing, summarize what was committed.",
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
          ? `Commit agent instructed (${vcs.kind}, with context)`
          : `Commit agent instructed (${vcs.kind})`,
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
      "Preflight VCS state, then instruct agent to commit granularly using Conventional Commits",
    argumentHint: "[extra context]",
    async handler(args, ctx) {
      await handleCommitChanges(args, ctx, pi);
    },
  });
}
