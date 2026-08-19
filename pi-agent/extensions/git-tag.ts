/**
 * git-tag extension — summarize commits since last tag, edit message,
 * create annotated tag, and push.
 *
 * Usage:
 *   /git-tag              auto-bumps patch version
 *   /git-tag 0.4.0        specify version explicitly
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { BorderedLoader, DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, matchesKey, Text } from "@earendil-works/pi-tui";

// ── helpers ──────────────────────────────────────────────────────────────────

function bumpPatch(prevTag: string): string {
  const m = prevTag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return "v0.1.0";
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

const SYSTEM_PROMPT = `You write git tag messages. Summarize the commits below.

Rules:
- 2-4 sentences, no bullet points
- Be factual, no marketing fluff
- Omit trivial chores (formatting, renames, CI tweaks)
- Output only the message, no preamble`;

// ── main command ─────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  pi.registerCommand("git-tag", {
    description: "Summarize commits since last tag, edit, create & push annotated tag",
    argumentHint: "[version]",

    async handler(args, ctx) {
      if (!ctx.hasUI) {
        ctx.ui.notify("git-tag needs interactive mode", "error");
        return;
      }
      if (!ctx.model) {
        ctx.ui.notify("No model selected — use /model first", "error");
        return;
      }

      // 1. gather commits since latest tag ───────────────────────────────
      const latest = await pi.exec("git", ["describe", "--tags", "--abbrev=0"]);
      const latestTag = latest.stdout.trim();
      let version = args.trim() || bumpPatch(latestTag || "v0.0.0");

      const range = latestTag ? `${latestTag}..HEAD` : "HEAD";

      const readRawCommits = async (): Promise<string> => {
        const log = await pi.exec("git", [
          "log",
          "--no-merges",
          "--format=%h %s",
          range,
        ]);
        return log.stdout.trim();
      };

      let rawCommits = await readRawCommits();
      if (!rawCommits) {
        ctx.ui.notify("No commits since last tag", "warning");
        return;
      }

      // dirty tree check
      const status = await pi.exec("git", ["status", "--porcelain"]);
      if (status.stdout.trim()) {
        const ok = await ctx.ui.confirm(
          "Dirty working tree",
          "Uncommitted changes exist. Continue anyway?",
        );
        if (!ok) return;
      }

      // 2. generate → review loop ───────────────────────────────────────
      let summary = "";
      let action: "accept" | "deny" | "retry" | "edit_version" | "edit_msg" = "retry";

      const generate = async (): Promise<string | null> => {
        const prompt = [
          "Generate a tag message for:",
          rawCommits,
        ].join("\n");

        const response = await ctx.modelRegistry.complete(
          ctx.model!,
          {
            systemPrompt: SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: [{ type: "text", text: prompt }],
                timestamp: Date.now(),
              },
            ],
          },
        );

        if (response.stopReason === "aborted") return null;
        return response.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      };

      while (action === "retry" || action === "edit_version" || action === "edit_msg") {
        if (action === "retry") {
          ctx.ui.notify("Generating summary...", "info");
          const genResult = await ctx.ui.custom<string | null>(
            (tui, theme, _kb, done) => {
              const loader = new BorderedLoader(
                tui,
                theme,
                `Summarizing ${rawCommits.split("\n").length} commits...`,
              );
              loader.onAbort = () => done(null);
              generate().then(done).catch(() => done(null));
              return loader;
            },
          );
          if (genResult === null) {
            ctx.ui.notify("Generation cancelled or failed", "warning");
            return;
          }
          summary = genResult;
        } else if (action === "edit_msg") {
          const edited = await ctx.ui.editor(`Tag message for ${version}`, summary);
          if (edited === undefined) { action = "deny"; break; }
          summary = edited;
        } else if (action === "edit_version") {
          const newVer = await ctx.ui.editor(`Edit version`, version);
          if (newVer !== undefined) {
            version = newVer.trim().split("\n")[0];
            ctx.ui.notify(`Version updated to ${version}`, "info");
          }
        }

        action = await reviewUI(ctx, { version, prevTag: latestTag, summary, commits: rawCommits });
      }

      // 3. execute ────────────────────────────────────────────────────────
      if (action === "accept") {
        const tag = await pi.exec("git", ["tag", "-a", version, "-m", summary]);
        if (tag.code !== 0) {
          ctx.ui.notify(`Tag failed: ${tag.stderr}`, "error");
          return;
        }

        const push = await pi.exec("git", ["push", "origin", version]);
        if (push.code !== 0) {
          ctx.ui.notify(`Push failed: ${push.stderr}`, "error");
          // tag was created locally — warn user
          ctx.ui.notify(
            `Tag ${version} created locally but push failed. Run: git push origin ${version}`,
            "warning",
          );
          return;
        }

        ctx.ui.notify(
          `Tag ${version} pushed`,
          "success",
        );
      } else {
        ctx.ui.notify("Tag cancelled", "info");
      }
    },
  });
}

// ── review UI ────────────────────────────────────────────────────────────────

type ReviewAction = "accept" | "deny" | "retry" | "edit_version" | "edit_msg";

async function reviewUI(
  ctx: any,
  opts: {
    version: string;
    prevTag: string;
    summary: string;
    commits: string;
  },
): Promise<ReviewAction> {
  return ctx.ui.custom<ReviewAction>((tui, theme, _kb, done) => {
    const mdTheme = getMarkdownTheme();

    const container = new Container();
    const border = new DynamicBorder((s: string) => theme.fg("accent", s));
    container.addChild(border);

    // header
    container.addChild(
      new Text(
        theme.fg("accent", theme.bold(`Tag ${opts.version}`)),
        1,
        0,
      ),
    );
    if (opts.prevTag) {
      container.addChild(
        new Text(theme.fg("dim", `Changes since ${opts.prevTag}`), 1, 0),
      );
    } else {
      container.addChild(new Text(theme.fg("dim", "First tag"), 1, 0));
    }

    const count = opts.commits.split("\n").filter(Boolean).length;
    container.addChild(new Text(theme.fg("dim", `${count} commits`), 1, 0));

    // tag message
    container.addChild(new Text("", 1, 0));
    container.addChild(
      new Text(theme.fg("muted", theme.bold("Tag message:")), 1, 0),
    );
    container.addChild(new Markdown(opts.summary, 1, 0, mdTheme));

    // hotkey bar
    container.addChild(new Text("", 1, 0));
    container.addChild(new Text(theme.fg("dim", "─".repeat(50)), 1, 0));
    container.addChild(
      new Text(
        "  " +
          theme.fg("success", "[Enter] Accept & Push") +
          "    " +
          theme.fg("error", "[Esc] Deny") +
          "    " +
          theme.fg("warning", "[Ctrl+R] Retry") +
          "    " +
          theme.fg("accent", "[Ctrl+E] Edit") +
          "    " +
          theme.fg("muted", "[Ctrl+T] Ver"),
        1,
        0,
      ),
    );

    container.addChild(border);

    return {
      render: (width: number) => container.render(width),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        if (matchesKey(data, "enter")) done("accept");
        else if (matchesKey(data, "escape")) done("deny");
        else if (matchesKey(data, "ctrl+r")) done("retry");
        else if (matchesKey(data, "ctrl+e")) {
          done("edit_msg");
        }
        else if (matchesKey(data, "ctrl+t")) {
          done("edit_version");
        }
      },
    };
  });
}
