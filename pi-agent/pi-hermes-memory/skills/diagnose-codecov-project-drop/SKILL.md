---
name: "diagnose-codecov-project-drop"
description: "Diagnose codecov/project failure when CI tests and coverage thresholds pass; compare exact base/head LCOV artifacts and uncover timing-dependent coverage."
version: 1
created: "2026-10-06"
updated: "2026-10-06"
---
## When to Use
GitHub PR Codecov project-delta check fails despite successful test jobs. Distinguish changed-code gaps from unrelated coverage nondeterminism before adding tests.

## Procedure
1. Read exact Codecov check-run summary via authenticated gh. Record base/head SHAs, project and patch coverage, thresholds if configured, check status and CI run IDs.
2. Download coverage artifacts for exact base and head CI runs into task-specific /tmp/pi-coding-agent/<task>/ paths. Use matching Node version from upload workflow; compare LCOV per-file metrics.
3. For Codecov-equivalent LCOV accounting, union DA and BRDA source line numbers per file. Lines with branches are miss if all branch counts zero, partial if some zero, hit if all positive; branch '-' is zero. Branchless lines use DA count. Verify computed totals equal actual check report before trusting comparison.
4. Locate regressions per file and source line. Map unchanged source lines directly; use source diff for shifted lines. Do not blame stale base when intervening commit changes only docs. A timer callback covered in base but missed in head needs deterministic fake-timer behavior test, not weaker threshold.
5. Add targeted behavior tests for missing changed-code paths and verified timing nondeterminism. Run affected tests, non-writing lint/typecheck, then full coverage with normal thresholds. On Pi hosts, clear inherited PI_PACKAGE_DIR when repository should resolve its own Pi SDK assets.
6. Preserve requested commit shape and use exact remote-head lease for authorized force-push. Verify published SHA and report remote Codecov status independently of local coverage success.

## Pitfalls
- Vitest coverage thresholds and Codecov project delta are separate acceptance signals.
- Even 100% patch coverage can coexist with project coverage drop if unchanged tests fail to exercise timers deterministically.
- Node-version/V8 coverage differences may alter instrumentation; match upload runtime when totals fail to reconcile.
- Worker turn limits can end before tests execute; inspect actual logs and exit evidence, retry once with exact command-only scope.
- Never change production behavior or relax coverage thresholds merely to inflate metric.

## Verification
1. Base/head calculated line/hit/miss/partial totals reconcile to Codecov report.
2. New tests assert observable behavior and clean up fake timers.
3. Full suite and normal coverage thresholds pass; project coverage meets required comparison.
4. Published PR preserves requested commit shape; remote checks either verified green or explicitly marked pending.