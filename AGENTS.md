# AGENTS.md — pi-config

Pi coding agent configuration repository. Defines subagents, extensions, MCP servers, skills, memory stores, and runtime settings. `~/.pi/agent` symlinks to `pi-agent/` — edits take effect immediately.

## Repository structure

```
pi-config/
├── AGENTS.md                  # This file — agent instructions for the repo
├── README.md                  # Human overview and bootstrap guide
├── install.sh                 # Bootstrap: creates ~/.pi/agent symlink
├── .gitignore                 # Excludes auth, sessions, memory DBs, caches
└── pi-agent/                  # Symlink target: ~/.pi/agent → here
    ├── agents/                # Subagent definitions (markdown + YAML frontmatter)
    ├── extensions/            # TypeScript TUI extensions (/git-tag, /agents, codex bars)
    ├── bin/                   # Shell scripts (yt-summarize)
    ├── pi-hermes-memory/      # Persistent memory (USER, MEMORY, failures, skills)
    ├── projects-memory/       # Per-project memory files
    ├── npm/                   # Node dependencies (gitignored — installed by pi-agent)
    ├── settings.json          # Model, provider, theme, packages, subagent overrides
    ├── models.json            # Custom model definitions (ollama local models)
    ├── mcp.json               # MCP server connections (kubernetes, nixos, terraform)
    ├── caveman.json           # Response style config
    ├── auth.json              # API keys + OAuth tokens (gitignored, SENSITIVE)
    └── pi-codex-conversion.json
```

## Core concepts

### Symlink deployment

`install.sh` creates exactly one symlink: `~/.pi/agent → pi-agent/`. No file copies, no npm install, no systemd. The pi-coding-agent runtime reads from `~/.pi/agent/`. Editing files here (via symlink) changes runtime behavior immediately.

Existing `~/.pi/agent` is backed up to `~/.pi/agent.backup.<timestamp>/` before linking.

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
name: my-agent                 # Required. Agent name for delegation and /agents list
description: |                 # Optional. Shown in agent list. First line is headline.
  What this agent does.
  Can span multiple lines.
model: deepseek-v4-flash       # Model override. Omit to inherit parent default.
tools: bash, read              # Comma-separated tool grants. Omit for no tools.
thinking: low                  # Thinking level: off, low, medium, high, xhigh
systemPromptMode: replace      # replace = full override, prepend = add before builtin
inheritProjectContext: false   # Whether agent receives project memory/prompts
inheritSkills: false           # Whether agent receives loaded skills
defaultContext: fresh          # Context mode: fresh (clean) or fork (branched from parent)
maxSubagentDepth: 0            # Max nested delegation depth (0 = cannot spawn subagents)
fallbackModels:                # Optional. Models to try if primary fails
  - openai/gpt-5-mini
---
System prompt body. Markdown. Sent as the agent's system message.
```

### Frontmatter field reference

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `name` | Yes | — | Single word, kebab-case. Unique within scope. |
| `description` | No | — | Pipe-block for multi-line. Keep first line short (shown in `/agents`). |
| `model` | No | parent default | Usually `deepseek-v4-flash` for cheap agents, `deepseek-v4-pro` for heavy. |
| `tools` | No | none | Comma-separated. Available tools depend on loaded extensions. |
| `thinking` | No | parent setting | `low` for simple agents, `medium`/`high` for complex. |
| `systemPromptMode` | No | parent default | `replace` = full system prompt override. `prepend` = add before builtin. |
| `inheritProjectContext` | No | false | Set `true` only when agent needs project conventions. |
| `inheritSkills` | No | false | Set `true` only when agent needs loaded skill procedures. |
| `defaultContext` | No | parent default | `fresh` = clean context. `fork` = branches from parent session. |
| `maxSubagentDepth` | No | 2 | `0` prevents agent from spawning subagents. |
| `fallbackModels` | No | — | List of models to try if primary fails. |
| `defaultProgress` | No | false | Show progress spinner by default. |
| `defaultReads` | No | false | Auto-read referenced files by default. |
| `output` | No | — | Default output file path. |

### Conventions for this repo

**Model choice:**
- `deepseek-v4-flash` — all custom subagents. Cheap, fast, sufficient for focused tasks.
- `deepseek-v4-pro` — only via settings.json overrides for builtins (planner, worker, reviewer, researcher, oracle).

**Context mode:**
- `fresh` — all custom subagents. Self-contained tasks with no parent history dependency.
- `fork` — builtins (oracle, worker, planner). Needs parent session history.

**Thinking level:**
- `low` — simple agents (web-fetcher, bandcamp-downloader, test-runner, youtube-summarizer).
- Not set (inherit) — agents that need reasoning (docs-analyzer, terraform-diff-analyzer).

**Tool grants:**
- Grant only what the agent actually calls. No kitchen-sink grants.
- `bash` — for running commands (test-runner, bandcamp-downloader, youtube-summarizer).
- `read` — for reading files (test-runner).
- `web_fetch, web_search` — for web access (web-fetcher).
- `mcp` — for MCP doc servers (docs-analyzer).
- `resolve-library-id, query-docs` — for Context7 documentation (docs-analyzer).

**System prompt mode:**
- Always `replace` — custom subagents get full system prompt control. No builtin prompt pollution.

**Inheritance:**
- `inheritProjectContext: false` — always. Agents don't need project conventions.
- `inheritSkills: false` — always. Agents are task-specific, skill-less.

**Max subagent depth:**
- `0` — always. Custom subagents execute tasks directly, never delegate.

### Discovery and scope precedence

Agent files are discovered from:
1. `pi-agent/agents/**/*.md` — what this repo provides (committed, shared)
2. `~/.pi/agent/agents/**/*.md` — user scope (not in this repo)
3. `~/.agents/**/*.md` — legacy user scope (not in this repo)
4. Builtin agents — lowest priority

Project scope (this repo) overrides user scope. User scope overrides builtins. Two agents with the same `name` in different scopes: highest priority wins.

## When to create a new agent

**HARD RULE: Never create subagents autonomously.** The pi-agent must not create, modify, or delete subagent definitions on its own initiative. Agent creation is a deliberate human decision, not an automated optimization. If a new agent seems warranted, ask the user explicitly — do not propose, do not draft, do not create.

When explicitly asked by the user, create a new agent when:
- A task pattern repeats across sessions (bandcamp downloads, test runs, diff analysis)
- The task needs a different model, context mode, or tool set than builtins
- The task requires a tightly scoped system prompt that prevents parent-model drift
- The task is I/O bound (fetch, download, parse) and doesn't need parent reasoning

Do NOT create an agent when:
- It's a one-off task
- A builtin agent handles it (worker for implementation, reviewer for review)
- The parent model can do it directly without special constraints
- User hasn't explicitly requested it

### Agent creation workflow (user-requested only)

Only execute when the user explicitly asks to create an agent.

1. Identify the task pattern and its constraints.
2. Choose model: `deepseek-v4-flash` unless task requires reasoning.
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
- `model` / `provider` — default model for parent agent
- `theme` — TUI theme
- `packages` — loaded npm extensions
- `subagents.agentOverrides` — per-builtin agent model/thinking/context overrides

Builtin agent overrides are preferred over copying builtin files. Example:
```json
{
  "subagents": {
    "agentOverrides": {
      "reviewer": {
        "model": "deepseek-v4-pro",
        "thinking": "high"
      }
    }
  }
}
```

### mcp.json

MCP server connections. Currently:
- `kubernetes` — local kubeconfig at `~/.kube/homelab.yml`
- `nixos` — package/option search (Docker)
- `terraform` — module/provider registry (Docker)

To add a new MCP server, add to `servers` object with `command`, `args`, and optional `env`.

### models.json

Custom model definitions. Currently:
- `ollama/gemma4-tool` — Gemma 4 8B, 128K context
- `ollama/qwen3.6:27b` — Qwen 3.6 27B, 128K context

Add new providers/models here. The `provider` field in settings.json must match a provider defined here or a builtin provider.

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
- `slash-subagents-list.ts` — `/agents` command: list all available subagents
- `pi-codex-bars.ts` — Codex usage widget (session/daily bars)

Extensions load via `packages` in `settings.json`. Dependencies declared in `npm/package.json` (gitignored, installed by pi-agent at runtime).

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
./install.sh
```

`install.sh` is idempotent — exits cleanly if symlink already correct.

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
- **Model default is `deepseek-v4-pro`** via opencode-go provider. Flash models for cheap subagents.
- **NixOS host.** Missing tools → `nix run nixpkgs#app -- <args>`.

## Related repositories

- `nixos-config/` — NixOS/home-manager config that installs pi-agent and deploys `~/.pi_1/agent/` (read-only).
- `homelab/` — homelab Kubernetes cluster config.
- `terraform/` — infrastructure as code.
