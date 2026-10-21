---
name: "diagnose-backup-api-retirement"
description: "Diagnose unchanged scheduled cloud backup jobs failing after vendor API retirement, especially cf-terraforming cloudflare_filter /filters HTTP 410 Gone code10020; distinguish remote shutdown from CI/image drift."
version: 1
created: "2026-10-16"
updated: "2026-10-16"
---
## When to Use
Scheduled cloud export or backup job begins failing without repository changes, especially explicit deprecated or retired API responses. Read-only investigation; no production API mutations or credential rotation.

## Procedure
1. Fetch exact failing job metadata and trace using existing authenticated CI CLI. Store raw evidence under task-specific /tmp/pi-coding-agent directory; never print credentials.
2. Identify first failing resource, HTTP endpoint, status, structured vendor code/message, and failure propagation. Separate executor/authentication failures from application API errors.
3. Compare last successful equivalent job and first failure: times, repository commits, CI config, tool/provider versions, and immutable image digests when available. Mutable latest tags do not prove identical tooling.
4. Inspect backup resource selection at its owning source, including code embedded in shared images. Check whether replacement resources are already exported before recommending omissions.
5. Verify retirement and replacement in official vendor docs. Distinguish announced unsupported date from observed shutdown window; do not infer exact rollout date.
6. Report root cause, verified failure window, incomplete-backup scope, minimal migration, and CI allow_failure settings that can mask failure.

## Pitfalls
- Cloudflare legacy Filters and Firewall Rules APIs can return 410 Gone with code10020; downgrading Terraform does not restore retired server endpoints.
- Skipping retired resources is safe only when equivalent current configuration is covered, such as cloudflare_ruleset with http_request_firewall_custom for legacy firewall rules.
- Successful overall pipeline can conceal failed backup jobs through allow_failure; successful older trace may omit subprocess/provider logs.

## Verification
1. Cite actual failing trace and last successful comparable job, with clear gaps.
2. Confirm recommended resource replacements against source selection and official documentation.
3. Do not claim remediation tested when investigation remained read-only.