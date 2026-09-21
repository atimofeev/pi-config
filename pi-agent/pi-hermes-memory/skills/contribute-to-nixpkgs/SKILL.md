---
name: "contribute-to-nixpkgs"
description: "Prepare and submit small package fixes to NixOS/nixpkgs according to current contribution, testing, commit, PR-template, and AI-assistance rules."
version: 6
created: "2026-09-17"
updated: "2026-09-17"
---
## When to Use
Use when creating or updating a pull request against NixOS/nixpkgs, especially package fixes under pkgs/by-name. Re-read upstream CONTRIBUTING.md and the pull-request template because policies change. Use a dedicated checkout and obey the active repository's Git/Jujutsu workflow.

## Procedure
1. Read current CONTRIBUTING.md, pkgs/README.md, .github/PULL_REQUEST_TEMPLATE.md, and the automation/AI policy on the target branch before editing.
2. Search open and closed GitHub issues and pull requests for the package and root-cause terms; record related fixes or precedents in the PR description.
3. Target master for ordinary package fixes unless branch policy explicitly requires another branch. Keep the change to one logical commit and avoid unrelated formatting or metadata edits.
4. Use a package-prefixed imperative commit and PR title, such as gpauth: fix runtime TLS support, with no final period. Keep the PR title identical so package CI recognizes the affected package.
5. Apply the smallest package-level fix. Do not add release notes or change maintainers/meta for a non-breaking runtime dependency correction unless current policy requires it.
6. Format changed Nix with nix fmt or nix develop --command treefmt, then inspect the exact diff.
7. Build the affected package and execute a relevant runtime smoke test on the declared platform. Use nixpkgs-review when useful for impact analysis; it is normally informational for a small leaf package.
8. Manually review all generated code and prose. When AI assistance was used, add the current policy's Assisted-by: <tool> <model/version> commit trailer and disclose assistance in the PR description.
9. Publish the commit: if direct push hangs (common with SSH on partial clones), create the exact commit via the GitHub API (blob, tree, commit, ref) then create the PR with gh. Do not retry push indefinitely; switch to API after one failed attempt.
10. Create the PR against NixOS/nixpkgs:master using gh pr create --draft. Preserve the current pull-request template exactly: keep its comment header, Things done heading, checkbox groups, and reference-link definitions, then fill the summary above it and check boxes honestly. Do not replace the template with custom headings or a custom checklist.
11. Pass complex PR bodies with --body-file, never as an inline shell argument. Shell interpolation can consume backticks and parentheses before gh receives the markdown.
12. Verify the published commit, PR base/head, rendered body, and initial CI/check state. Address review or CI findings with focused follow-up commits unless maintainers request another history shape.
## Pitfalls
- Do not assume nixpkgs policy from memory; contribution, formatting, and AI-assistance rules can change.
- Do not omit the package prefix from the title; CI uses it to select package builds.
- Adding a runtime library to buildInputs may place it in the closure without making plugin/module paths discoverable. Use the package ecosystem's standard wrapper hook where required.
- Do not add release notes for routine non-breaking package fixes or modify maintainers without a separate reason.
- Do not claim no duplicate exists unless both issues and pull requests were searched, including closed items and alternate error text.
- Do not submit AI-generated changes without manual review and the required assistance disclosure.
- Do not use raw Git commands in a checkout containing .jj; follow the Jujutsu workflow there.
- Do not pass a complex PR body directly as a shell argument; backticks and command substitutions are expanded before gh receives it. Use --body-file.
- Do not replace the official PR template with custom headings or checklist structure; preserve template structure and fill its sections.
- Do not keep retrying a hanging SSH push. Check remote branch state and use the authenticated GitHub API to create blob, tree, commit, and ref instead.
## Verification
1. Changed files are limited to the intended package fix and required generated metadata, if any.
2. Nix formatting passes with no unrelated diff.
3. The affected package builds successfully on the tested platform.
4. A runtime smoke test exercises the failing path and demonstrates the fix, not merely --help.
5. Commit subject and PR title follow <package>: <imperative description> and match each other.
6. Commit includes the required Assisted-by trailer when applicable, and the PR description discloses AI assistance.
7. PR targets the intended nixpkgs branch and preserves the current template's comment header, Things done heading, checkbox groups, and reference-link definitions.
8. Rendered PR body contains accurate markdown after shell handling; inspect gh pr view output rather than trusting the submitted source.
9. Exact test commands and platforms are listed, and relevant precedent is linked.
10. Initial GitHub checks start successfully; any unavailable or intentionally skipped check is stated explicitly.