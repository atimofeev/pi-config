# AGENTS.md — pi-config

Pi coding agent configuration repository. Defines subagents, extensions, MCP servers, skills, memory stores, and runtime settings. `~/.pi/agent` symlinks to `pi-agent/`; `~/.agents/skills` symlinks to `skills/` — edits take effect immediately.

## Repository structure

```
pi-config/
├── AGENTS.md                  # This file — agent instructions for the repo
├── README.md                  # Human overview and bootstrap guide
├── justfile                   # Bootstrap/link tasks
├── .gitignore                 # Excludes auth, sessions, memory DBs, caches
├── skills/                    # Shared procedural skills (committed)
└── pi-agent/                  # Symlink target: ~/.pi/agent → here
    ├── agents/                # Subagent definitions (markdown + YAML frontmatter)
    ├── extensions/            # TypeScript TUI extensions (/git-tag, codex bars, commit-changes, jj-footer, theme-overrides)
    ├── bin/                   # Shell scripts (yt-summarize)
    ├── pi-hermes-memory/      # Persistent memory (USER, MEMORY, failures, skills)
    ├── projects-memory/       # Per-project memory files
    ├── npm/                   # Node dependencies (gitignored — installed by pi-agent)
    ├── SYSTEM.md              # Response style, environment, delegation policy
    ├── settings.json          # Model, provider, theme, packages
    ├── subagents.json         # @tintinweb/pi-subagents global runtime defaults
    ├── models.json            # Custom model definitions (ollama local models)
    ├── mcp.json               # MCP server connections (kubernetes, nixos, terraform)
    ├── caveman.json           # Response style config
    ├── auth.json              # API keys + OAuth tokens (gitignored, SENSITIVE)
    └── pi-codex-conversion.json
```

## Core concepts

### Symlink deployment

`just install` creates two symlinks: `~/.pi/agent → pi-agent/` and `~/.agents/skills → skills/`. No file copies, no npm install, no systemd. The pi-coding-agent runtime reads from `~/.pi/agent/`. Editing files here (via symlink) changes runtime behavior immediately.

Existing targets are backed up to `<target>.backup.<timestamp>` before linking.

### What's NOT tracked

Sensitive or generated files excluded via `.gitignore`:
- `auth.json` — API keys and OAuth tokens
- `sessions/`, `run-history.jsonl` — full conversation logs
- `pi-hermes-memory/sessions.db*` — SQLite session database
- `pi-hermes-memory/{USER,MEMORY,failures}.md` — personal/system memory
- `mcp-cache.json`, `mcp-npx-cache.json` — tool caches
- `projects-memory/` — per-project session memory
- `npm/` — node_modules installed by pi-agent at runtime

## Subagent definitions

### File format

Subagents are defined as markdown files with YAML frontmatter in `pi-agent/agents/`. Each file produces one executable agent discovered automatically.

```markdown
---
description: |                 # Optional. Shown in agent list. First line is headline.
  What this agent does.
  Can span multiple lines.
tools: bash, read              # Built-in tools; `ext:<ext>/<tool>` for extension tools
                               # `none` = no tools, omit = all built-ins
extensions: false              # Which extensions load: true (all), false (none), or list
skills: false                  # Inherit parent skills: true, false, or comma-separated names
model: deepseek/deepseek-v4-flash  # Optional. Omit to inherit parent model.
thinking: low                  # Thinking level: off, low, medium, high, xhigh
---
System prompt body. Markdown. Sent as the agent's system message (prompt_mode: replace default).
```

### Frontmatter field reference

Filename supplies the default agent name; `name` overrides it. Field defaults for `@tintinweb/pi-subagents` v0.17.x:

| Field | Default | Notes |
|-------|---------|-------|
| `description` | filename | Shown in agent list. First line is headline. |
| `name` | filename | Agent type used by `subagent_type` and handles. |
| `display_name` | — | UI display name |
| `color` | — | Optional agent badge color. |
| `tools` | all 7 built-ins | Built-in names (`read, bash, edit, write, grep, find, ls`), `*`/`all`, `none`, and `ext:<ext>/<tool>` selectors |
| `extensions` | `true` | Which extensions load: `true` (all), `false` (none), or comma-separated names |
| `exclude_extensions` | — | Denylist applied after `extensions` |
| `skills` | `true` | Inherit parent skills: `true`, `false`, or comma-separated names |
| `memory` | — | Persistent memory scope: `project`, `local`, or `user`. |
| `disallowed_tools` | — | Tools denied after other tool selection. |
| `isolation` | — | `worktree` for isolated checkout; `off` to refuse worktree isolation. |
| `model` | parent model | Omit to inherit. Custom agents pin `deepseek/deepseek-v4-flash`. |
| `thinking` | parent setting | `off, minimal, low, medium, high, xhigh, max` |
| `max_turns` | unlimited | Max agentic turns; `0` = unlimited |
| `persist_session` | `rememberAgents` | Persist as normal pi session; per-agent override. |
| `output_transcript` | `outputTranscript` | Write `.output` transcript; per-agent override. |
| `session_dir` | pi default | Session directory when persistence is enabled. |
| `allowed_subagents` | none | Opt in to specific nested subagents or `all`. |
| `prompt_mode` | `replace` | `replace` = body is full system prompt; `append` = appended to parent prompt |
| `inherit_context` | `false` | Fork parent conversation into agent |
| `run_in_background` | `false` | Run in background by default |
| `isolated` | `false` | Built-in tools only; no extensions/skills/context |
| `enabled` | `true` | `false` hides the agent |

### Conventions for this repo

**Model choice:**
- Parent default is whatever `settings.json` `defaultModel`/`defaultProvider` specifies. Changes often — don't hardcode here.
- Focused custom subagents pin `deepseek/deepseek-v4-flash` in frontmatter `model:`.
- Embedded overrides (`general-purpose`, `Plan`, `Explore`) pin their own models in frontmatter.

**Context mode:**
- Fresh by default (target default). `inherit_context: true` only when the agent needs parent conversation history.

**Thinking level:**
- `low` — docs-analyzer and web-fetcher.
- Not set (inherit) — bandcamp-downloader, terraform-diff-analyzer, test-runner, and youtube-summarizer.

**Tool grants:**
- Grant only what the agent actually calls. No kitchen-sink grants.
Examples:
- `bash` — running commands.
- `read` — reading files.
- `ext:rpiv-web-tools/web_fetch, ext:rpiv-web-tools/web_search` — web access.
- `ext:context7/*, ext:rpiv-web-tools/*, ext:pi-mcp-adapter/mcp` — docs.
- `tools: none` — pure prompt tasks with no tools.

**Prompt mode:**
- `replace` default — custom subagents get full system prompt control. No builtin prompt pollution.

**Inheritance:**
- `extensions: false` + `skills: false` for pure built-in tasks. Web/docs agents list their extensions explicitly.

**Nesting:**
- Custom agents in this repo never spawn subagents. v0.17 supports opt-in `allowed_subagents`; intentionally unused here.

### Discovery and scope precedence

Agent files are discovered from (higher priority wins):
1. `<cwd>/.pi/agents/**/*.md` — project scope (authoritative)
2. `<cwd>/.agents/agents/**/*.md` — shared workspace (read-only)
3. `~/.pi/agent/agents/**/*.md` — global scope (this repo)
4. Embedded defaults (`general-purpose`, `Explore`, `Plan`) — lowest priority

Same name in higher scope overrides lower. `/agents` command (from `@tintinweb/pi-subagents`) lists and manages all.

## When to create a new agent

**HARD RULE: Never create subagents autonomously.** The pi-agent must not create, modify, or delete subagent definitions on its own initiative. Agent creation is a deliberate human decision, not an automated optimization. If a new agent seems warranted, ask the user explicitly — do not propose, do not draft, do not create.

When explicitly asked by the user, create a new agent when:
- A task pattern repeats across sessions (bandcamp downloads, test runs, diff analysis)
- The task needs a different model, context mode, or tool set than builtins
- The task requires a tightly scoped system prompt that prevents parent-model drift
- The task is I/O bound (fetch, download, parse) and doesn't need parent reasoning

Do NOT create an agent when:
- It's a one-off task
- A builtin agent handles it (general-purpose, Explore, Plan)
- The parent model can do it directly without special constraints
- User hasn't explicitly requested it

### Agent creation workflow (user-requested only)

Only execute when the user explicitly asks to create an agent.

1. Identify the task pattern and its constraints.
2. Choose model: pin `deepseek/deepseek-v4-flash` for cheap I/O-bound tasks; omit `model:` to inherit the parent model for heavy reasoning.
3. Choose tools: grant exactly what the task calls. Check available tool names.
4. Write a tight system prompt: goal, steps, output format, rules, stop conditions.
5. Add frontmatter following conventions above.
6. Save to `pi-agent/agents/<name>.md`.
7. Test: delegate to the new agent with a sample task.
8. Commit.

### Agent system prompt guidelines

Effective agent system prompts are:
- **Procedural, not conversational.** "Run this command. Extract X. Output Y. Stop." Not "You are a helpful assistant..."
- **Self-contained.** Agent doesn't know about parent conversation. Include all needed instructions.
- **Output format explicit.** Show the exact structure, not "summarize however you want."
- **Stop rules explicit.** "Never retry." "If X, output Y and stop." "One command only."
- **Error handling explicit.** "If exit code > 0, report the error and stop." "If URL not found, output ERROR: ..."
- **Short.** Most agents fit in 20-40 lines of system prompt. If growing past 60 lines, split into two agents or use a skill.

Anti-patterns to avoid:
- "You are an expert..." — don't fluff. State what the agent does.
- "Feel free to..." — agents don't have feelings. State rules.
- "You might want to..." — no hedging. State what to do.
- "If you're unsure, ask..." — agents shouldn't ask. They should stop with an error code.

## Configuration files

### settings.json

Central runtime config. Edit here for persistent changes:
- `model` / `provider` — default model/provider for parent agent
- `theme` — TUI theme
- `packages` — loaded npm extensions
- `enabledModels` — model allowlist

### subagents.json

`@tintinweb/pi-subagents` runtime defaults, separate from settings.json. Global: `~/.pi/agent/subagents.json` (this repo, committed). Project: `<cwd>/.pi/subagents.json` (written by `/agents` → Settings). Project overrides global.

Current global:
```json
{
  "rememberAgents": false,
  "outputTranscript": false
}
```

`outputTranscript: false` disables per-subagent `.output` files. `rememberAgents: false` keeps subagent sessions in memory instead of adding them to pi session storage. Per-agent `output_transcript` and `persist_session` override these defaults. Other settings (max concurrency, default max turns, grace turns, nested depth, default join mode, disable defaults, widget mode, scheduling, tool description mode) via `/agents` → Settings or subagents.json.

### mcp.json

MCP server connections. Currently:
- `kubernetes` — `mcp-server-kubernetes` via npx, common kubeconfig `~/.kube/config`, context `mcp-none` (no single-context filtering)
- `nixos` — package/option search (Docker)
- `terraform` — module/provider registry (Docker)
- `aws-docs` — AWS documentation search (Docker)
- `github` — GitHub MCP (HTTP, copilot)
- `sidero-docs` — Sidero Labs docs (HTTP)

To add a new MCP server, add to `servers` object with `command`, `args`, and optional `env`.

### models.json

Custom model definitions for local providers (e.g. ollama). Add new providers/models here. The `provider` field in settings.json must match a provider defined here or a builtin provider.

### caveman.json

Response style config:
- `defaultLevel: "full"` — full caveman mode (drop articles, fragments, terse)
- `showStatus: false` — no status messages

### auth.json

SENSITIVE. Gitignored. Contains:
- `opencode-go.apiKey` — API key for opencode-go provider
- `openai-codex.*` — OAuth JWT + refresh token for Codex API

Never commit. Never share. Never read into context unless debugging auth failures.

## Memory system

### pi-hermes-memory/

Persistent memory store managed by `pi-hermes-memory` extension:
- `USER.md` — user preferences, communication style, standing instructions
- `MEMORY.md` — global notes, environment facts, tool quirks
- `failures.md` — categorized failures and lessons learned
- `skills/` — procedural skills (how-to workflows)
- `sessions.db` — SQLite session index

All gitignored except skills. Skills are shareable procedures.

### projects-memory/

Per-project memory files. One `MEMORY.md` per project. Gitignored — personal session context, not shared configuration.

## Extensions

TUI extensions in TypeScript under `pi-agent/extensions/`:
- `git-tag.ts` — `/git-tag` command: summarize commits, create tag, push
- `pi-codex-bars.ts` — Codex usage widget (session/daily bars)
- `commit-changes.ts` — `/commit-changes` command: atomic conventional commits (git + jj)
- `jj-footer.ts` — Footer patch showing jj bookmark instead of git detached HEAD
- `theme-overrides.ts` — Applies `themeOverrides` from settings.json at session start

The `/agents` subagent management command ships with the `@tintinweb/pi-subagents` package — no local extension.

All extensions import from `@earendil-works/pi-coding-agent` (formerly `@mariozechner/pi-coding-agent`).

## Shell scripts

### bin/yt-summarize

Extracts YouTube transcripts via yt-dlp. Tries 11 languages, cleans VTT/SRT formatting, deduplicates, trims to 600 lines.

Exit codes: 0=success, 1=no transcript, 2=rate limited/bot blocked, 3=error.

Used by `youtube-summarizer` agent.

## Bootstrap flow

On a new machine:
```bash
git clone <repo-url> ~/repos/pi-config
cd ~/repos/pi-config
just install
```

`just install` is idempotent — skips symlinks already pointing at correct targets.

## Daily workflow

Edit files in `~/.pi/agent/` (follows symlink to repo). Commit from repo root:
```bash
cd ~/repos/pi-config
git add -A
git commit -m "descriptive message"
git push
```

Changes take effect immediately — pi-agent re-reads agent files on each delegation, settings.json on startup.

## Project conventions

- **No Nix flake or package.nix** here. pi-agent itself is installed via home-manager in `nixos-config` repo.
- **Caveman mode is enforced** — SYSTEM.md sets response style. Agents should match: terse, technical, no fluff.
- **User is DevOps/infra engineer** managing prod k8s, ClickHouse, Kafka. Works in Russian with colleagues.
- **Model default is in `settings.json`** (`defaultModel`/`defaultProvider`). Custom agents pin models in frontmatter — check agent files for current values.
- **NixOS host.** Missing tools → `nix run nixpkgs#app -- <args>`.

## Related repositories

- `nixos-config/` — NixOS/home-manager config that installs pi-agent and deploys `~/.pi_1/agent/` (read-only).
- `homelab/` — homelab Kubernetes cluster config.
- `terraform/` — infrastructure as code.
