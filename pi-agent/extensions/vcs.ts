import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Spacer, Text } from "@earendil-works/pi-tui";

type VcsEntry = {
  vcs: "jj" | "git";
  root: string;
  output: string;
};

const COLLAPSED_LINES = 10;
const ANSI_ESCAPE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_RESET = /\x1b\[(?:0)?m/g;
const ANSI_RESET_EXCEPT_BACKGROUND = "\x1b[22;23;24;25;27;28;29;39m";
const DIFF_METADATA = /^(?:diff --git |(?:old|new|deleted file|new file) mode |(?:dis)?similarity index |(?:rename|copy) (?:from|to) |index |--- |\+\+\+ )/;

export default function (pi: ExtensionAPI) {
  registerVcsRenderer(pi, "vcs-diff", "diff", true);
  registerVcsRenderer(pi, "vcs-status", "status");

  pi.registerCommand("diff", {
    description: "Show colorful working-copy diff",
    async handler(_args, ctx) {
      const cwd = ctx.cwd;
      const jjRoot = await pi.exec("jj", ["root"], { cwd }).catch(() => undefined);

      if (jjRoot?.code === 0) {
        const root = jjRoot.stdout.trim();
        const result = await pi.exec(
          "jj",
          ["--color=always", "--no-pager", "diff", "--git"],
          { cwd: root },
        );
        showDiff(pi, ctx, "jj", root, result);
        return;
      }

      const gitRoot = await pi
        .exec("git", ["rev-parse", "--show-toplevel"], { cwd })
        .catch(() => undefined);

      if (gitRoot?.code !== 0 || !gitRoot?.stdout.trim()) {
        ctx.ui.notify(`No git or Jujutsu repository found from ${cwd}`, "warning");
        return;
      }

      const root = gitRoot.stdout.trim();
      const result = await pi.exec(
        "git",
        ["--no-pager", "diff", "--color=always", "--no-ext-diff"],
        { cwd: root },
      );
      showDiff(pi, ctx, "git", root, result);
    },
  });

  pi.registerCommand("st", {
    description: "Show changed files",
    async handler(_args, ctx) {
      const cwd = ctx.cwd;
      const jjRoot = await pi.exec("jj", ["root"], { cwd }).catch(() => undefined);

      if (jjRoot?.code === 0) {
        const root = jjRoot.stdout.trim();
        const result = await pi.exec(
          "jj",
          ["--color=always", "--no-pager", "diff", "--summary"],
          { cwd: root },
        );
        showStatus(pi, ctx, "jj", root, result);
        return;
      }

      const gitRoot = await pi
        .exec("git", ["rev-parse", "--show-toplevel"], { cwd })
        .catch(() => undefined);

      if (gitRoot?.code !== 0 || !gitRoot?.stdout.trim()) {
        ctx.ui.notify(`No git or Jujutsu repository found from ${cwd}`, "warning");
        return;
      }

      const root = gitRoot.stdout.trim();
      const result = await pi.exec(
        "git",
        ["-c", "color.status=always", "status", "--short", "--no-branch", "--untracked-files=all"],
        { cwd: root },
      );
      showStatus(pi, ctx, "git", root, result);
    },
  });
}

function registerVcsRenderer(
  pi: ExtensionAPI,
  entryType: string,
  label: string,
  colorFileBlocks = false,
) {
  pi.registerEntryRenderer<VcsEntry>(entryType, (entry, { expanded }, theme) => {
    const lines = entry.data.output.split("\n");
    const collapsed = !expanded && lines.length > COLLAPSED_LINES;
    const output = (collapsed ? lines.slice(0, COLLAPSED_LINES).join("\n") : entry.data.output).replace(
      ANSI_RESET,
      ANSI_RESET_EXCEPT_BACKGROUND,
    );
    const box = new Box(1, 1, (text) => theme.bg("toolSuccessBg", text));
    box.addChild(
      new Text(
        theme.fg("toolTitle", theme.bold(`${entry.data.vcs} ${label}`)) +
          theme.fg("muted", ` · ${lines.length} lines · ${entry.data.root}`),
        0,
        0,
      ),
    );
    if (colorFileBlocks) {
      for (const [index, block] of output.split("\n\n").entries()) {
        if (index > 0) {
          box.addChild(new Spacer(1));
        }
        const fileBox = new Box(1, 0, (text) => theme.bg("toolPendingBg", text));
        fileBox.addChild(new Text(block, 0, 0));
        box.addChild(fileBox);
      }
    } else {
      box.addChild(new Text(output, 0, 0));
    }
    if (collapsed) {
      box.addChild(
        new Text(
          theme.fg("muted", `… ${lines.length - COLLAPSED_LINES} more lines (Ctrl+O to expand)`),
          0,
          0,
        ),
      );
    }
    return box;
  });
}

function showDiff(
  pi: ExtensionAPI,
  ctx: { ui: { notify(message: string, type?: "info" | "warning" | "error"): void } },
  vcs: VcsEntry["vcs"],
  root: string,
  result: { code: number; stdout: string; stderr: string },
) {
  if (result.code !== 0) {
    ctx.ui.notify(result.stderr.trim() || `${vcs} diff failed`, "error");
    return;
  }

  if (!result.stdout.trim()) {
    pi.appendEntry<VcsEntry>("vcs-diff", {
      vcs,
      root,
      output: "No changes",
    });
    return;
  }

  pi.appendEntry<VcsEntry>("vcs-diff", {
    vcs,
    root,
    output: formatDiff(result.stdout),
  });
}

function formatDiff(output: string): string {
  const lines = output.trimEnd().split("\n");
  const formatted: string[] = [];

  for (let index = 0; index < lines.length;) {
    if (!plain(lines[index]).startsWith("diff --git ")) {
      formatted.push(lines[index]);
      index += 1;
      continue;
    }

    const metadata: string[] = [];
    while (index < lines.length && DIFF_METADATA.test(plain(lines[index]))) {
      metadata.push(plain(lines[index]));
      index += 1;
    }

    if (formatted.length > 0) {
      formatted.push("");
    }
    formatted.push(`\x1b[1m${diffFilename(metadata)}\x1b[0m`);
  }

  return formatted.join("\n");
}

function diffFilename(metadata: string[]): string {
  const renamedFrom = metadata.find((line) => line.startsWith("rename from "))?.slice(12);
  const renamedTo = metadata.find((line) => line.startsWith("rename to "))?.slice(10);
  if (renamedFrom && renamedTo) {
    return `${renamedFrom} -> ${renamedTo}`;
  }

  const copiedFrom = metadata.find((line) => line.startsWith("copy from "))?.slice(10);
  const copiedTo = metadata.find((line) => line.startsWith("copy to "))?.slice(8);
  if (copiedFrom && copiedTo) {
    return `${copiedFrom} -> ${copiedTo}`;
  }

  const newPath = metadata.find((line) => line.startsWith("+++ "))?.slice(4);
  const oldPath = metadata.find((line) => line.startsWith("--- "))?.slice(4);
  const path = newPath && newPath !== "/dev/null" ? newPath : oldPath;
  if (path && path !== "/dev/null") {
    return stripDiffPrefix(path);
  }

  const header = metadata[0] ?? "diff";
  const newPathStart = Math.max(header.lastIndexOf(" b/"), header.lastIndexOf(' "b/'));
  return newPathStart >= 0 ? stripDiffPrefix(header.slice(newPathStart + 1)) : header.slice(11);
}

function stripDiffPrefix(path: string): string {
  return path.replace(/^([ab])\//, "").replace(/^"([ab])\//, '"');
}

function plain(line: string): string {
  return line.replace(ANSI_ESCAPE, "");
}

function showStatus(
  pi: ExtensionAPI,
  ctx: { ui: { notify(message: string, type?: "info" | "warning" | "error"): void } },
  vcs: VcsEntry["vcs"],
  root: string,
  result: { code: number; stdout: string; stderr: string },
) {
  if (result.code !== 0) {
    ctx.ui.notify(result.stderr.trim() || `${vcs} status failed`, "error");
    return;
  }

  if (!result.stdout.trim()) {
    pi.appendEntry<VcsEntry>("vcs-status", {
      vcs,
      root,
      output: "No changes",
    });
    return;
  }

  pi.appendEntry<VcsEntry>("vcs-status", {
    vcs,
    root,
    output: result.stdout.trimEnd(),
  });
}
