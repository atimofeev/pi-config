# AGENTS.md — pi-config

## Purpose

Repository for Pi coding-agent configuration. It contains global instructions, subagent definitions, local extensions, skills, tool configuration, runtime settings, and bootstrap links.

Most deployed paths are symlinks into this repository, so edits may affect live Pi sessions immediately. `justfile` is the source of truth for link targets.

## Repository structure

```
AGENTS.md                 # repository-specific instructions
README.md                 # human overview and bootstrap guide
justfile                  # deployment/link tasks
*.json                    # top-level extension configuration
skills/                   # committed shared skills
pi-agent/
  agents/                 # subagent definitions (*.md)
  extensions/             # local TypeScript extensions (*.ts)
  bin/                    # helper executables
  pi-hermes-memory/       # memory extension state and committed skills
  projects-memory/        # ignored per-project state
  SYSTEM.md               # global runtime instructions
  settings.json           # primary Pi runtime settings
  subagents.json          # subagent runtime defaults
  models.json             # custom model definitions
  mcp.json                # MCP adapter settings and server overrides
  caveman.json            # response-style configuration
  auth.json               # ignored credentials; sensitive
```

Use directory patterns and configuration files to discover current contents. Do not maintain inventories of agents, extensions, models, servers, commands, or link targets in this document.

## Deployment

- `just install` runs link tasks declared in `justfile`.
- `_link` backs up conflicting targets with a timestamp and skips correct symlinks.
- Deployment links files; it does not install Pi, packages, or system services.
- Runtime reload behavior varies by file. Agent definitions are discovered during delegation; startup settings generally require restart or reload.
- Use `just --list` for current deployment tasks instead of copying their inventory into prose.

## Edit boundaries

- Minimum scoped diff. Touch only files required by the task.
- Reuse existing definitions and extension patterns before adding new ones.
- Do not add abstractions, packages, agents, or config layers speculatively.
- Comments only for non-obvious behavior.
- `.gitignore` is the source of truth for sensitive and generated state.
- Do not edit ignored credentials, sessions, caches, memory databases, discovered-model state, installed packages, or per-project memory unless the task explicitly targets that state.
- Never read credentials into context except for an explicitly authorized auth-debug task. Never commit or share them.

## Sources of truth

| Concern | Source |
| --- | --- |
| Deployment links | `justfile` |
| Default provider/model, allowlist, theme, packages | `pi-agent/settings.json` |
| Custom model definitions | `pi-agent/models.json` |
| Agent inventory and per-agent model/tool policy | `pi-agent/agents/*.md` frontmatter |
| Global subagent defaults | `pi-agent/subagents.json` |
| MCP settings and server overrides | `pi-agent/mcp.json` |
| Local extension inventory and commands | `pi-agent/extensions/*.ts` |
| Global response and delegation policy | `pi-agent/SYSTEM.md` |
| Helper behavior and exit status | executable under `pi-agent/bin/` |

Current values belong in these files, not in `AGENTS.md`.

## Subagent definitions

Subagents are markdown files with YAML frontmatter under `pi-agent/agents/`. Filename supplies default agent name. Body is agent system prompt.

```markdown
---
description: Short capability summary
tools: bash, read
extensions: false
skills: false
thinking: low
---
Task-specific system prompt.
```

Supported fields, defaults, discovery precedence, and selectors depend on installed subagent package version. Check installed package documentation, runtime tool schema, and existing agent files before editing; do not copy a version-specific field table here.

### Conventions

- Fresh context by default. Set context inheritance only when parent conversation is required.
- Grant only tools and extensions agent calls.
- Use full prompt replacement for focused agents unless parent instructions are intentionally needed.
- Omit model pin to inherit parent. Pin only when task requires a stable model class; inspect frontmatter for current route values.
- Keep skills and extensions disabled unless agent uses them.
- Do not enable nested subagents without an explicit requirement.
- Verify effective inventory and scope through runtime agent tooling rather than duplicating precedence rules here.

## Agent-definition hard rule

**Never create, modify, or delete subagent definitions autonomously.** Agent-definition changes require explicit user request. If new agent seems useful, ask first; do not draft or create it preemptively.

When explicitly requested, add an agent only when repeated task needs distinct tools, model behavior, context mode, or tightly scoped prompt. Prefer existing built-in or local agent for one-off work.

### User-requested workflow

1. Define repeated task, inputs, outputs, errors, and stop conditions.
2. Inspect installed schema and current agent patterns.
3. Choose minimum tools, extensions, skills, context, and model policy.
4. Write concise self-contained prompt with exact output format.
5. Save definition under `pi-agent/agents/`.
6. Delegate representative sample and verify result.

### Prompt guidelines

- Procedural, not conversational.
- Self-contained; agents do not know parent context unless inherited.
- Exact output format and stop rules.
- Explicit error handling.
- Short enough to audit. Split only when tasks are genuinely independent.
- No expert-persona fluff, hedging, or open-ended retries.

## Configuration ownership

- `settings.json` owns persistent Pi runtime settings and loaded packages.
- `subagents.json` owns global subagent runtime defaults; project-local config may override it.
- `mcp.json` owns Pi-specific MCP adapter settings and overrides. Shared/global server definitions may come from external system configuration; preserve layering instead of copying them here.
- `models.json` owns custom provider/model definitions. Route selection must match available built-in or custom providers.
- Response-style config belongs in its dedicated JSON file; prompt policy belongs in `SYSTEM.md`.

## Memory

- Personal memory, session indexes, recovery files, and per-project context are runtime state and ignored.
- Procedural skills intended for sharing are committed under designated skill directories.
- Do not convert personal memory into repository instructions without explicit request.

## Extensions and scripts

- Local TUI extensions are auto-discovered from `pi-agent/extensions/*.ts`. Read registrations for current command and UI behavior.
- Extension dependencies belong in runtime package configuration, not ad hoc vendored copies.
- Local Pi extensions use current `@earendil-works` Pi API packages; follow existing imports.
- Helpers under `pi-agent/bin/` own their implementation, usage, and exit-code contract. Keep agent callers aligned with script behavior.

## Verification

Run smallest relevant check:

- JSON change: parse changed file with `jq empty <file>`.
- Agent change: run representative delegation through that agent.
- Extension or helper change: run its focused syntax/self-check or existing test path.
- Link-task change: inspect `just --list`, then verify `just install` remains idempotent.
- Runtime setting change: reload or restart Pi as required and inspect effective behavior.

## Environment

- NixOS host. Missing tool: `nix run nixpkgs#app -- <args>`.
- This repository owns runtime configuration, not Pi installation. External Home Manager configuration owns package installation.
- No local Nix flake or package expression unless explicitly introduced by a task.
- Follow active repository VCS workflow. Use Conventional Commits when committing is requested.
