---
name: "audit-cloud-backup-coverage"
description: "Audit AWS/Cloudflare backup coverage across accounts, enabled regions and resource classes; distinguish export success, completeness and restore validity."
version: 1
created: "2026-10-17"
updated: "2026-10-17"
---
## When to Use
Use when asked whether a cloud configuration backup covers everything, all accounts or all resources, or when a successful provider/exporter regression test is being treated as proof of universal coverage. This is a read-only audit, not authorization to broaden scopes, deploy fixes or restore infrastructure.

For an all-enabled-regions presence matrix or suspected workloads outside configured backup regions, read [regional resource presence audit](../audit-aws-regional-resource-presence/SKILL.md). That skill contains the bounded SDK scan, pagination, S3 reconciliation and unknown-versus-absent checks. Load it only when regional inventory is within the approved scope.

## Procedure
1. Read production CI and wrapper configuration first. Extract actual account inventory, credential groups, regions, service/type allowlists, exclusions, pagination and failure handling. Credential aliases and account names may differ; one Cloudflare credential group can contain multiple configured accounts.
2. Verify exact image identity and source parity, including the wrapper script inside the image as well as Dockerfile, provider pins and patches. Use network-disabled local inspection rather than rebuilding or pulling an unverified image.
3. Prefer existing named AWS profiles for interactive checks when the user provides them. Resolve profile identities privately and compare account IDs with configured/captured owner IDs. Deduplicate profiles by account; distinguish an extra profile from an extra account. Keep extra-account resource inventory within explicit scope.
4. Compare configured regions with enabled regions, but never infer workload presence from enabled status alone. Compare service selectors with actual resource inventories. For a decisive negative check, privately derive referenced IDs for an unexported resource class and verify their current existence using filtered read-only APIs; references alone may be stale.
5. For Cloudflare, follow the production inventory shape and credential group exactly. Paginate account and zone APIs explicitly, reconcile configured IDs privately, and compare the source-equivalent unfiltered zone set with configured-account-filtered sets. Separate managed ruleset catalogs from user custom/root configuration.
6. Reuse compatible prior export/native-validation evidence only with explicit provenance and limits. Matching IDs, successful processes and a green pipeline are not universal coverage proofs. Inspect missing meaningful empty blocks and known baseline-invalid configuration separately.
7. Persist only private allowlisted metadata reports with timestamps, exact scopes, counts, pagination, errors and unsupported/unverified coverage. A concrete live omission disproves completeness without an exhaustive service scan; clearly state that the rest of the inventory remains unverified.
8. Report findings first, with code locations and actionable account/resource gaps. Distinguish configuration/state exports from resource-data backups and actual restore tests. Do not implement fixes, expand account scope, enable services, or claim promotion approval unless requested.

## Pitfalls
- Do not assume a display account label is a credential alias or that each credential alias maps to exactly one account. Parse the same configuration used by production before loading credentials.
- A visible account is not automatically an intended or owned account. Reconcile additional accounts before exporting their resources.
- An unpaginated API can currently return every item while still being a latent truncation defect; do not invent an observed omission when counts fit the first page.
- A token-wide zone listing can include zones from accounts absent from account-level configuration. Report this inconsistency rather than treating account and zone counts as equivalent scope.
- Schemas and exporter support lists do not enumerate all deployed cloud products. Resource Explorer, tagging APIs and Config inventories also have coverage limits.
- Never print raw inventory responses, account/resource IDs, ARNs, credentials, user data, policy bodies or user-defined tag/map keys. Allowlist profile aliases and public resource-type/region names carefully.
- Materialize temporary helpers explicitly. Use one coherent Python withPackages interpreter for SDK dependencies, or standard-library Python plus the existing AWS CLI; installing a Python package into a shell does not necessarily expose it to the host interpreter.
- Shared private artifact parents may already exist. Validate their ownership, permissions and lack of symlinks; create a fresh per-probe child instead of deleting or recreating the parent.

## Verification
1. Exact tested image contains the current wrapper script and matches recorded source-input hashes.
2. Authenticated account identities reconcile with configured account counts without exposing identifiers.
3. Each claimed omission is supported by a live scoped read result or a directly verified configuration failure, not a stale reference alone.
4. Pagination completion, request caps, permissions failures and uninspected services/regions/accounts are explicit.
5. The final answer separates universal completeness, configured-scope compatibility, native configuration validity and actual restore behavior.
6. No cloud mutations, unapproved account/resource probes, automatic retries, commits, pushes or deployments occurred.