# pi-config

Pi coding agent configuration — sub-agents, extensions, skills, MCP servers, settings.

`~/.pi/agent` symlinks to `pi-agent/` in this repo. Edits take effect immediately. `.gitignore` excludes all sensitive files.

## Structure

```
pi-agent/
├── agents/                   # Sub-agent definitions (markdown manifests)
├── extensions/               # TypeScript extensions
├── skills/                   # Pi-native skills
├── bin/                      # Custom scripts
├── pi-hermes-memory/skills/  # Legacy hermes-format skills
├── caveman.json              # Caveman mode config
├── mcp.json                  # MCP server definitions
├── settings.json             # Main settings (non-sensitive)
├── models.json               # Custom model definitions
└── pi-codex-conversion.json  # Codex conversion feature flags
```

## What's NOT tracked (.gitignore)

| Excluded | Reason |
|----------|--------|
| `auth.json` | API tokens (OAuth JWT + API keys) |
| `sessions/` | Full conversation logs |
| `run-history.jsonl` | Run history with prompts |
| `memory/`, `pi-hermes-memory/sessions.db*` | Session databases |
| `pi-hermes-memory/{USER,MEMORY,failures}.md` | Personal/system memory |
| `mcp-cache.json`, `mcp-npx-cache.json` | Tool caches |
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
