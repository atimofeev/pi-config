# pi-config

Versioned Pi coding-agent configuration: global instructions, subagents, extensions, skills, tool configuration, runtime settings, and bootstrap links.

## Installation

```bash
just install
```

`just install` deploys repository configuration through symlink tasks defined in `justfile`.

Existing non-matching targets are backed up to `<target>.backup.<timestamp>`; correct symlinks are skipped. Run `just --list` for current link tasks instead of relying on duplicated target inventory.

Most linked files become live runtime configuration immediately. Startup settings may require Pi reload or restart.

## Layout

```
justfile                  # deployment/link tasks
skills/                   # committed shared skills
pi-agent/
  agents/                 # subagent definitions (*.md)
  extensions/             # local TypeScript extensions (*.ts)
  bin/                    # helper executables
  pi-hermes-memory/       # memory extension state and skills
  projects-memory/        # ignored per-project state
  APPEND_SYSTEM.md        # primary-agent instructions appended to Pi defaults
  settings.json           # primary runtime settings
  subagents.json          # subagent runtime defaults
  models.json             # custom model definitions
  mcp.json                # optional native Pi MCP file overrides
```

## Sources of truth

| Concern | Source |
| --- | --- |
| Deployment links | `justfile` |
| Provider, model, theme, and loaded packages | `pi-agent/settings.json` |
| Agent inventory and per-agent policy | `pi-agent/agents/*.md` |
| Subagent runtime defaults | `pi-agent/subagents.json` |
| Custom model definitions | `pi-agent/models.json` |
| Shared MCP connection definitions | External Home Manager `~/.config/mcp/mcp.json` |
| Pi-only MCP exposure policy and shared importer | `pi-agent/extensions/shared-mcp.ts` |
| Optional native MCP file overrides | `pi-agent/mcp.json` |
| Local extensions and commands | `pi-agent/extensions/*.ts` |
| Primary-agent prompt and delegation policy | `pi-agent/APPEND_SYSTEM.md` |
| Memory behavior and skill admission policy | `pi-agent/hermes-memory-config.json` |

Shared connection definitions come from external Home Manager `~/.config/mcp/mcp.json`. The native importer in `pi-agent/extensions/shared-mcp.ts` respects `XDG_CONFIG_HOME` and uses `registerMcpServer`; it does not replace the native `/mcp` command. Pi-only exposure policy lives in that extension, and `/reload` rereads the shared configuration.

Native Pi also reads `~/.pi/agent/mcp.json`, deployed through the agent-directory link. `pi-agent/mcp.json` is optional file overrides, not the shared source: a native file definition replaces the entire registered entry, rather than merging fields. Session `/mcp` sees imported servers; shell `pi mcp list` does not load extensions and lists only file-defined servers.

Read current values from these files. Do not duplicate inventories of agents, extensions, commands, models, MCP servers, versions, packages, or link targets in documentation.

## Skill curation

Hermes uses a custom memory policy in `pi-agent/hermes-memory-config.json`. New skills require likely recurrence, a substantial non-obvious procedure, verified steps, and no suitable existing skill or short memory alternative. Explicit requests to save a procedure are also supported. Tool-call count, debugging effort, and task completion do not justify a new skill.

Prefer updating an existing skill or adding an on-demand reference. Small durable facts belong in memory; routine work needs neither. Keep repository-specific procedures in the owning project's skill directory. Versioned pi-config development skills live in `.pi/skills/`; Hermes-managed project skills remain local under `pi-agent/projects-memory/`.

Skills are used through automatic discovery, not manual invocation. Keep retained skills automatically discoverable; do not hide them with `disable-model-invocation: true`. Reduce clutter through consolidation and user-approved removal, not manual-only flags. `/memory-skills` or `skill_manage` with `action: view` lists Hermes-managed skills.

Run `/reload` after curation; restart Pi to load changes to Hermes configuration.

## Local state and secrets

`.gitignore` defines credentials, sessions, caches, personal memory, installed packages, and generated discovery state. Treat ignored files as local runtime data, not shared configuration. Never read credentials unless explicitly debugging authentication.

## Development

- Keep changes scoped to requested configuration.
- Reuse existing agent and extension patterns.
- Follow `AGENTS.md` for edit boundaries, subagent rules, and verification.
- Pi installation is owned by external Home Manager configuration; this repository owns runtime configuration only.
- NixOS missing tool: `nix run nixpkgs#app -- <args>`.
