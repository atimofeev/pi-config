---
name: "repair-unreachable-opentofu-git-module-pin"
description: "Diagnose OpenTofu init invalid ref for Git module SHA after history rewrite; prove equivalent reachable replacement before changing pin."
version: 1
created: "2026-10-16"
updated: "2026-10-16"
---
## When to Use
OpenTofu init reports Failed to download module and invalid ref for pinned Git commit, while hosting API may still return old commit.

## Procedure
1. Capture actual init stderr, not wrapper exit code. Inspect stack runtime, module source, backend, provider constraints and lockfile first.
2. Reproduce without backend access in unique temporary directory containing only necessary configuration files. Use init -backend=false -input=false; avoid copying state/secrets and generating lockfiles in checkout.
3. Inspect effective SSH settings before diagnostic overrides. Do not infer sandboxing from a Nix store executable path. Distinguish artificial host-key failures from original module failure.
4. Check hosting API for commit existence AND branch/tag containment. API-readable commits can be dangling after history rewrites and absent from normal Git clones.
5. Identify candidate rewritten commit through history/metadata, then prove exact module-content equivalence using recursive tree blob IDs and straight old-to-new comparison with no diff/truncation/timeout. Do not substitute latest main without equivalence evidence.
6. Change only affected source pin. Preserve provider/backend versions and generated files. Run fmt check, isolated backend-free init, and validate; inspect actual diff.
7. State whether original plain backend-enabled init remains untested and whether a reviewed real plan is still required. Do not apply.

## Pitfalls
- API commit endpoint success does not prove current branches/tags reach commit.
- Do not assume shallow-clone cause without depth parameter or fetch evidence. Documentation hypotheses cannot override exact configuration and live reachability evidence.
- A no-op diff must not result from timed-out, truncated or merge-base comparison. Prefer straight comparison plus tree evidence.
- Backend-free init still downloads private modules and providers. Preserve auth and host verification; never silently weaken SSH security.
- Temporary validation without existing lockfile may select newer provider version; report tested version and do not commit accidental upgrade.

## Verification
1. Original error reproduced and candidate ref resolves.
2. Old/new module tree contents match exactly; source pin is only checkout change.
3. Formatting check and backend-free init/validate results inspected; failures disclosed.
4. No remote state, backend config, provider constraints, credentials, or generated files modified.