import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";

type DiffEntry = {
  vcs: "jj" | "git";
  root: string;
  output: string;
};

const COLLAPSED_LINES = 10;
const ANSI_RESET = /\x1b\[(?:0)?m/g;
const ANSI_RESET_EXCEPT_BACKGROUND = "\x1b[22;23;24;25;27;28;29;39m";

export default function (pi: ExtensionAPI) {
  pi.registerEntryRenderer<DiffEntry>("vcs-diff", (entry, { expanded }, theme) => {
    const lines = entry.data.output.split("\n");
    const collapsed = !expanded && lines.length > COLLAPSED_LINES;
    const output = (collapsed ? lines.slice(0, COLLAPSED_LINES).join("\n") : entry.data.output).replace(
      ANSI_RESET,
      ANSI_RESET_EXCEPT_BACKGROUND,
    );
    const box = new Box(1, 1, (text) => theme.bg("toolSuccessBg", text));
    box.addChild(
      new Text(
        theme.fg("toolTitle", theme.bold(`${entry.data.vcs} diff`)) +
          theme.fg("muted", ` · ${lines.length} lines · ${entry.data.root}`),
        0,
        0,
      ),
    );
    box.addChild(new Text(output, 0, 0));
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
}

function showDiff(
  pi: ExtensionAPI,
  ctx: { ui: { notify(message: string, type?: "info" | "warning" | "error"): void } },
  vcs: DiffEntry["vcs"],
  root: string,
  result: { code: number; stdout: string; stderr: string },
) {
  if (result.code !== 0) {
    ctx.ui.notify(result.stderr.trim() || `${vcs} diff failed`, "error");
    return;
  }

  if (!result.stdout.trim()) {
    ctx.ui.notify("No changes", "info");
    return;
  }

  pi.appendEntry<DiffEntry>("vcs-diff", {
    vcs,
    root,
    output: result.stdout.trimEnd(),
  });
}
