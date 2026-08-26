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
  SYSTEM.md               # global runtime instructions
  settings.json           # primary runtime settings
  subagents.json          # subagent runtime defaults
  models.json             # custom model definitions
  mcp.json                # MCP adapter settings and overrides
```

## Sources of truth

| Concern | Source |
| --- | --- |
| Deployment links | `justfile` |
| Provider, model, theme, and loaded packages | `pi-agent/settings.json` |
| Agent inventory and per-agent policy | `pi-agent/agents/*.md` |
| Subagent runtime defaults | `pi-agent/subagents.json` |
| Custom model definitions | `pi-agent/models.json` |
| MCP settings and overrides | `pi-agent/mcp.json` |
| Local extensions and commands | `pi-agent/extensions/*.ts` |
| Global prompt and delegation policy | `pi-agent/SYSTEM.md` |

Read current values from these files. Do not duplicate inventories of agents, extensions, commands, models, MCP servers, versions, packages, or link targets in documentation.

## Local state and secrets

`.gitignore` defines credentials, sessions, caches, personal memory, installed packages, and generated discovery state. Treat ignored files as local runtime data, not shared configuration. Never read credentials unless explicitly debugging authentication.

## Development

- Keep changes scoped to requested configuration.
- Reuse existing agent and extension patterns.
- Follow `AGENTS.md` for edit boundaries, subagent rules, and verification.
- Pi installation is owned by external Home Manager configuration; this repository owns runtime configuration only.
- NixOS missing tool: `nix run nixpkgs#app -- <args>`.
