import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type NotifyType = "info" | "warning" | "error";
type CommandContext = {
  hasUI: boolean;
  ui: {
    notify(message: string, type?: NotifyType): void;
  };
};

function buildPrompt(extraContext: string): string {
  const base = [
    "Commit current changes granularly using Conventional Commits.",
    "",
    "Rules:",
    "- Detect VCS first. If `.jj/` exists, activate Jujutsu workflow before any VCS command and do not use raw git commands.",
    "- Otherwise use git normally.",
    "- Inspect status, staged diff, and unstaged diff before committing.",
    "- If no changes exist, report clean tree and stop.",
    "- Group related changes into logical commits.",
    "- Preserve unrelated pre-staged work unless it belongs to current commit group.",
    "- Each commit message must use Conventional Commits format: type(scope): description",
    "- Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build",
    "- Keep commits atomic: one logical change per commit.",
    "- Use clear, imperative descriptions: 'add X' not 'added X'.",
    "- Stage only files or hunks needed for each commit.",
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

async function handleCommitChanges(
  args: string,
  ctx: CommandContext,
  pi: ExtensionAPI,
): Promise<void> {
  const extraContext = args.trim();
  const prompt = buildPrompt(extraContext);

  try {
    pi.sendUserMessage(prompt, { deliverAs: "followUp" });
    if (ctx.hasUI) {
      ctx.ui.notify(
        extraContext
          ? "Instructing agent to commit changes (with context)"
          : "Instructing agent to commit changes",
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
      "Instruct agent to granularly commit current changes using Conventional Commits",
    argumentHint: "[extra context]",
    async handler(args, ctx) {
      await handleCommitChanges(args, ctx, pi);
    },
  });
}
