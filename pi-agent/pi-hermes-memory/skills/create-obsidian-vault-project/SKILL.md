---
name: "create-obsidian-vault-project"
description: "Create new project in user obsidian-vault from conversation research, following AGENTS.md, flat projects layout, vault-schema metadata, Dataview discovery and safe JJ verification."
version: 1
created: "2026-10-10"
updated: "2026-10-10"
---
## When to Use
User asks to create project note in obsidian-vault; not bulk metadata cleanup or archiving.

## Procedure
1. Locate vault and read its AGENTS.md completely; read required tagging, PARA, dashboard and other task references. Treat older migration proposals as subordinate to current AGENTS.md.
2. Infer project subject from immediate conversation when high confidence; ask only when ambiguity changes requested project. Preserve verified facts versus unknowns, and do not invent deadlines or completed implementation.
3. Load Jujutsu skill before VCS operations if .jj exists. Record initial status, preserve unrelated files, and do not commit, push or change snapshot limits without user request.
4. Choose projects/<kebab-case>.md and stable id. Check target absent and id unique; stop on collisions rather than overwrite. Use required id/aliases/type/tags, suitable domain and explicit initial lifecycle where clear.
5. Prefer existing topic tags, maximum five. For personal project omit work tag; dynamic dashboard will discover active project without dashboard changes.
6. Write one project note with goal, actionable checkboxes, verified baseline, risks/unknowns, acceptance criteria and source links. Mark research already completed separately from implementation still pending. Link only existing related notes.
7. Read actual created file and inspect JJ diff/stat. Validate metadata, unique id and wikilinks. Report exact path; leave existing notes and cluster unchanged.

## Pitfalls
- No lifecycle subdirectories, numbered PARA folders or folder index convention should be invented.
- Vault log is required for dedicated scheduled/background maintenance jobs, not automatically for every foreground one-note creation.
- Never store credentials or tokens in project note; refer to secret manager.
- Initial unrelated untracked large files can trigger JJ snapshot warnings; do not alter ignore files or JJ configuration to silence them.

## Verification
1. Exactly requested project file appears in diff; no unrelated changes made.
2. Metadata matches current vault allowed values and id is unique.
3. Project has concrete outcome and pending acceptance tasks; verified versus untested findings remain explicit.