# pi-config

Pi coding agent configuration — sub-agents, extensions, skills, MCP servers, settings, memory.

`~/.pi/agent` symlinks to `pi-agent/` in this repo. Edits take effect immediately. `.gitignore` excludes all sensitive files.

## Structure

```
pi-config/
├── AGENTS.md                     # AI agent instructions for this repo
├── README.md
├── install.sh
└── pi-agent/                     # ~/.pi/agent symlinks here
    ├── SYSTEM.md                 # Response style, environment, delegation policy
    ├── settings.json             # Main settings (non-sensitive)
    ├── models.json               # Custom model definitions
    ├── mcp.json                  # MCP server definitions
    ├── caveman.json              # Caveman mode config
    ├── pi-codex-conversion.json  # Codex conversion feature flags
    ├── agents/                   # Sub-agent definitions (markdown manifests)
    ├── extensions/               # TypeScript TUI extensions
    ├── bin/                      # Custom shell scripts
    └── pi-hermes-memory/
        └── skills/               # Procedural skills (committed)
```

## What's NOT tracked (.gitignore)

| Excluded | Reason |
|----------|--------|
| `auth.json` | API tokens (OAuth JWT + API keys) |
| `sessions/` | Full conversation logs |
| `run-history.jsonl` | Run history with prompts |
| `pi-hermes-memory/sessions.db*` | Session databases |
| `pi-hermes-memory/{USER,MEMORY,failures}.md` | Personal/system memory |
| `npm/` | Node modules (installed by pi-agent at runtime) |
| `mcp-cache.json`, `mcp-npx-cache.json`, `mcp-onboarding.json` | MCP tool caches |
| `projects-memory/` | Per-project session memory |

## Bootstrap on new machine

```bash
git clone <this-repo> ~/repos/pi-config
cd ~/repos/pi-config
./install.sh
```

`install.sh` creates one symlink: `~/.pi/agent → pi-agent/`. Existing `~/.pi/agent` backed up to `~/.pi/agent.backup.<timestamp>/`.

## Daily use

No workflow change. Edit files in `~/.pi/agent/` (follows symlink to repo). Commit from repo:

```bash
cd ~/repos/pi-config
git add -A
git commit -m "what changed"
git push
```
