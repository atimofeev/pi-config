---
name: "assess-upstream-pr-viability"
description: "Assess whether an upstream contribution is worthwhile before implementation: contribution and AI policies, approved-contributor gates, PR merge versus closed-unmerged ratios, external cohorts, feature acceptance and code/test scope."
version: 1
created: "2026-10-19"
updated: "2026-10-19"
---
## When to Use
User asks whether to invest in an upstream PR, how often contributions are rejected, or whether maintainers will accept a proposed feature. Research only unless implementation or posting is separately authorized.

## Procedure
1. Read current default-branch CONTRIBUTING, AGENTS, PR templates and linked contribution policies before implementation; identify authenticated GitHub account with gh and check any contributor allowlist or enforced intake workflow.
2. Check existing issue/discussion/PR for exact behavior and maintainer approval. Distinguish an idea being discussed from permission to submit implementation.
3. Query authenticated GitHub counts for all PRs, open, merged, and closed-unmerged. Record UTC timestamp and exact query strings; compute closed-unmerged / (merged + closed-unmerged), never include open PRs in decided-outcome denominator.
4. Analyze bounded recent closed cohort separately for external contributors, excluding known bots and separating current approved accounts where feasible. Inspect representative closure comments to distinguish policy rejection from withdrawal, duplicates, supersession or abandoned work.
5. Map smallest implementation against current source: input routing and precedence, config declarations/defaults/validation, documentation/help, tests, compatibility. Mark estimates as estimates and avoid building when eligibility is already blocked.
6. Synthesize recommendation weighted by enforced policy and accepted feature scope, not aggregate merge rates. Verify decisive raw artifacts, link sources, state sampling and classification limits, and report no remote mutation unless explicitly authorized.

## Pitfalls
- Closed without merge is not equivalent to rejected; commit adoption or replacement PRs can hide acceptance.
- Global merge rates are often dominated by maintainers or project-owned bots; current policy can make historical rates irrelevant.
- Contributor allowlists can change. A current-list retrospective cohort is not historical eligibility.
- Do not open a PR to test an auto-close gate, request allowlisting when policy forbids applications, or treat informal discussion as authorization.
- Do not attribute an existing issue to the user without checking its author.

## Verification
1. Policy and enforcement workflow read from same recorded source revision; acting account eligibility verified.
2. Outcome counts reconcile where repository totals and search semantics permit; numerators, denominators, cohort and as-of timestamp explicit.
3. Representative closure reasons and implementation claims have exact source evidence; unrun tests clearly labeled.
4. No implementation or remote posts created by assessment alone.