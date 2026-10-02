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

Shared connection definitions come from external Home Manager `~/.config/mcp/mcp.json`. The native importer in `pi-agent/extensions/shared-mcp.ts` respects `XDG_CONFIG_HOME` and uses `registerMcpServer`; it does not replace the native `/mcp` command. Pi-only exposure policy lives in that extension, and `/reload` rereads the shared configuration.

Native Pi also reads `~/.pi/agent/mcp.json`, deployed through the agent-directory link. `pi-agent/mcp.json` is optional file overrides, not the shared source: a native file definition replaces the entire registered entry, rather than merging fields. Session `/mcp` sees imported servers; shell `pi mcp list` does not load extensions and lists only file-defined servers.

Read current values from these files. Do not duplicate inventories of agents, extensions, commands, models, MCP servers, versions, packages, or link targets in documentation.

## Local state and secrets

`.gitignore` defines credentials, sessions, caches, personal memory, installed packages, and generated discovery state. Treat ignored files as local runtime data, not shared configuration. Never read credentials unless explicitly debugging authentication.

## Development

- Keep changes scoped to requested configuration.
- Reuse existing agent and extension patterns.
- Follow `AGENTS.md` for edit boundaries, subagent rules, and verification.
- Pi installation is owned by external Home Manager configuration; this repository owns runtime configuration only.
- NixOS missing tool: `nix run nixpkgs#app -- <args>`.
