---
name: "upgrade-terraformer-source-with-provider-patches"
description: "Upgrade an archived Terraformer source pin to the latest release or final commit while retaining AWS provider-major compatibility patches; resolve missing go.sum entries after gRPC updates, avoid dependency downgrades, build/test and verify exact-image CVEs without premature live-export claims."
version: 1
created: "2026-10-17"
updated: "2026-10-17"
---
## When to Use
Use when upgrading Terraformer from a pinned source commit, checking an archived upstream's final revision, or rebuilding a patched Go exporter against newer provider binaries. The procedure does not authorize live cloud replays, deployments or publishing commits.

## Procedure
1. Use authenticated GitHub tooling to verify archive status, default-branch HEAD, latest release/tag commit, current pin ancestry and relevant file diffs. Distinguish the source commit from potentially stale CLI version constants.
2. Inspect generic conversion/HCL ordering, import options, provider initialization, dependency manifests and every locally patched generator file. Untouched target files suggest low rebase risk but do not prove patch applicability.
3. Compare existing security dependency overrides with the new upstream go.mod. Remove overrides that would downgrade newer upstream dependencies; retain required security upgrades. Reconcile the graph with go mod tidy before tests when go.sum entries become missing after a dependency update. Keep checksum verification enabled.
4. Record private before/after hashes for all build inputs and preserve known dirty-worktree changes. Make the minimal Dockerfile/source-pin edit; keep official provider binaries unmodified. Do not silently create, describe, push or rewrite VCS commits.
5. Apply the compatibility patch during the real source build. Run core conversion utility tests and focused provider compatibility tests with count=1. Do not replace test failures with skips or weaken guards for configured/nondefault/unknown state.
6. Preserve each failed attempt's log and exit separately. A corrected attempt after an understood module/checksum issue is distinct from an automatic retry. Stop at any new failure instead of broadening fixes speculatively.
7. Build a separately tagged local candidate with an IID file. Verify actual source diffs, untouched-input hashes, test-success lines, build exit and exact image identity before reporting success.
8. Scan the exact local image using fresh vulnerability intelligence and no ignore/bypass configuration. Check actual critical findings, scanner DB timestamps and image-ID agreement; do not reuse a historical zero-critical result as current security acceptance.
9. Compare Terraform, provider, wrapper, lock and other exporter binary hashes and runtime configuration against the prior candidate. Byte-identical validation components can justify reusing cached-HCL verdicts, not claiming newly generated outputs were validated.
10. Report what changed, actual tests/security outcomes and remaining gates. Request or use explicitly approved scoped read-only paired cloud exports to test changed Terraformer API/conversion behavior before promotion; no apply, remote-state writes or deployment.

## Pitfalls
- Latest release and final archived default-branch commit can differ. A CLI reporting an old release version does not establish that the source pin is old or new.
- A go get override pinned to fix an earlier vulnerability may become a downgrade after rebasing upstream. Inspect versions rather than blindly carrying every old override.
- Missing go.sum entries after a dependency update are a module-graph setup issue, not evidence that AWS compatibility tests failed. Use normal checksum-preserving reconciliation, never GOSUMDB=off or test bypasses.
- Some release binaries emit dev or non-semver version labels. Record an unknown/non-semver label instead of rejecting the whole runtime comparison or inventing the configured release version.
- Cached-HCL native validation does not exercise a newly compiled Terraformer's resource reads or HCL generation, even when every provider and Terraform binary is identical.
- Source build success and successful unit tests are not evidence of export completeness, semantic fidelity or successful restore. Retained pre-existing validation failures must stay explicit.
- Use bare local sha256 image IDs, not repository@ syntax for a configuration ID. Restrict scanner image sources to Docker if registry fallback is forbidden.

## Verification
1. Final source revision and dependency choices are justified by actual upstream metadata and manifests.
2. The compatibility patch applies, core and focused tests actually run, and the exact final image build succeeds.
3. Other source files remain byte-identical unless explicitly part of the requested change; all failed logs remain private and preserved.
4. Fresh scan results identify the same exact image and do not conceal critical vulnerabilities or stale intelligence.
5. Any native/Cloudflare evidence reuse is component-proven and labeled reuse, not a new API replay.
6. No unauthorized cloud exports, account/region expansion, production writes, commits, pushes or deployments occur.