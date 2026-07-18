---
name: gh-cli
description: Enforces authenticated gh CLI workflows over unauthenticated curl/WebFetch patterns. Use when working with GitHub URLs, API access, pull requests, or issues.
---

# gh-cli

## When to Use

- Working with GitHub repositories, pull requests, issues, releases, or raw file URLs.
- You need authenticated access to private repositories or higher API rate limits.
- You are about to use `curl`, `wget`, or unauthenticated web fetches against GitHub.

## When NOT to Use

- The target is not GitHub.
- Plain local git operations already solve the task.

## Guidance

Prefer authenticated `gh` CLI over raw HTTP fetches for GitHub content.

- Run `gh auth status` before GitHub operations. If auth fails, report it and use `curl` with `GITHUB_TOKEN` only when available.
- Use `gh repo view`, `gh pr view`, `gh pr list`, `gh issue view`, `gh issue list`, `gh release view`, and `gh api` over unauthenticated `curl` or `wget`.
- Pass `--repo <owner>/<repo>` when target repo differs from current git remote or context is ambiguous.
- Use `--json <fields>` and `--jq '<filter>'` for structured output. Avoid parsing human text output.
- Prefer cloning repository and reading files locally over fetching `raw.githubusercontent.com` blobs directly.
- Avoid GitHub API `/contents/` endpoints as substitute for cloning and reading repository files.

## Failure Handling

- If `gh` is missing, report `gh not found` and fall back to `curl` only when task can be completed safely.
- If `gh auth status` fails, report auth failure and fall back to `curl` with `GITHUB_TOKEN` only when available.
- If `gh` command fails, report exact error and stop. Do not silently retry with unauthenticated requests.

## Destructive Actions

Confirm with user before running destructive operations:

- `gh pr merge`
- `gh release delete`
- `gh repo delete`
- `gh api -X DELETE ...`

Use `--dry-run` when available. Never merge, delete, close, or mutate without explicit approval.

## Anti-patterns

- Do not use unauthenticated `curl`, `wget`, or web fetch for GitHub API, PRs, issues, or private content when authenticated `gh` is available.
- Do not skip `--repo` for cross-repo work.
- Do not use `/contents/` API when clone + local read is practical.

Examples:

```sh
gh auth status
gh repo view owner/repo
gh pr view 123 --repo owner/repo
gh pr view 123 --repo owner/repo --json title,state,mergeable --jq '.title'
gh api repos/owner/repo/releases/latest --jq '.tag_name'
git clone https://github.com/owner/repo.git /tmp/repo
cat /tmp/repo/path/to/file.md
```
