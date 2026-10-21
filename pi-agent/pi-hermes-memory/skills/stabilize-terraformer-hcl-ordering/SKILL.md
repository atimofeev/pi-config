---
name: "stabilize-terraformer-hcl-ordering"
description: "Fix Terraformer ordering churn in CloudFront ordered_cache_behavior, WAFv2 rule blocks, or IAM assume_role_policy Principal arrays without corrupting ordered lists or authorization data; use provider schema, exact diffs and causal offline controls."
version: 2
created: "2026-10-18"
updated: "2026-10-18"
---
## When to Use
Terraformer repeatedly moves CloudFront behaviors, WAF rules, or IAM trust-policy Principal members despite unchanged values. Diagnose exact collection semantics before changing serialization; never sort captured backups wholesale.

## Procedure
1. Inspect exact referenced before/after HCL in memory. Handle policy heredocs, not only quoted JSON strings. Separate whole-block permutations, nested membership permutations and genuine changes. Report public schema paths/counts only, preserving duplicate bodies and member counts.
2. Read pinned provider schema and applicable AWS semantics. CloudFront ordered_cache_behavior/default_cache_behavior are lists; AWS6 WAFv2 WebACL rule is a set. IAM Principal member arrays grant permissions by logical OR, but this does not authorize sorting arbitrary JSON arrays. Official reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html .
3. For generic blocks, trace typed flatmap decoding and AST serialization at immutable source. List decoder should retain numeric indices. Set map iteration can randomize decoded order; body-based sorting before child canonicalization can propagate nested randomness and corrupt ordered blocks.
4. Canonicalize sets only at typed decoding boundary: collect eligible unique parent keys from matching full attributes, preserving exact count/unknown/ignore checks, sort collected keys, then decode/filter once per parent. Do not deduplicate by decoded value or enforce new count semantics. Leave list/tuple decoders unchanged.
5. Stable-sort HCL ObjectItems by individual key-token path components only; shorter prefixes first, equal key paths preserve input sequence. Remove scalar list/tuple value sorting and body-based tie-breaks. Keep map-formatting hints and no-sort API semantics separate.
6. For IAM trust JSON, use role-specific PostConvertHook before existing interpolation escaping/heredoc wrapping. Validate complete JSON, reject duplicate decoded object keys with a small token preflight, decode with UseNumber, accept Statement object/list, and sort only all-string Principal member arrays under recognized principal types. Preserve duplicates, scalar/array shape and every non-target array. Return original on invalid/ambiguous input or when no target array changes; never mutate raw provider state or broaden to attachments.
7. Add focused tests through existing public APIs so controls compile on original code. Generic coverage: 12-element list indices, repeated blocks, lists/tuples, quoted/component keys, nested sets, unknown/duplicate members, ignore/count/empty edge cases, and 100 reconstructions/serializations under both flags. IAM coverage: recognized Principal types, wildcard/scalar/unknown inputs, statement ordering, conditions/non-target arrays, duplicate keys including escaped equivalents, large numbers, existing AWS-variable escaping, idempotence and 100 permutations.
8. Run current utility and compatibility suites offline against patched source in cached builder. Restore original core or IAM hook only inside separate container and require assertion failures rather than compiler/setup errors. Use set -eu and cmp to verify restored source before tests. For CloudFront fixtures, keep earlier comparator fields identical so they cannot accidentally align old body sorting with intended order.
9. Integrate patch append-only where practical and update build test selectors so new IAM tests actually execute. Verify actual source diff, clean combined patch application, unchanged unrelated hashes, local IID and runtime components. Keep cloud export, commit, push, security scan and deployment separately authorized. If replaying private policy pairs, send them only through RAM/stdin to offline helper and persist counts—not documents.

## Pitfalls
- Never alphabetize CloudFront behaviors or globally sort HCL/JSON lists. WAF rule order need not equal priority order; preserve priorities and all values.
- Apply ignore matching to full attribute keys before parent extraction. Keep parent when any eligible descendant remains. Preserve legacy zero/invalid counts, unknown values and distinct duplicate-valued parents.
- Sorting every resource attribute map for every nested set adds avoidable cost. Sort only collected matching parent keys.
- A CloudFront fixture can falsely pass old code when an earlier nested marker happens to sort in desired input order. Inspect named negative failures, not merely overall nonzero status.
- An ignored cp failure can run a supposed negative control against patched code and yield a false pass. Stop setup failures and byte-compare restored original source before executing tests.
- IAM JSON map decoding collapses duplicate keys and plain float64 decoding can alter numbers. Reject ambiguous duplicate keys, use Number preservation and keep unrelated arrays untouched. Helper-level precision tests do not prove downstream formatters preserve arbitrary numeric lexemes.
- Tests calling newly added private helpers cannot compile against original source. Test IAM through existing PostConvertHook, or explicitly distinguish unit testing from baseline wiring controls.
- A test-only refinement does not change production code. If image predates it, document provenance and prove core/binary identity; do not claim an exact full-patch build.
- This fix does not establish every exporter path deterministic or solve API lifecycle changes, permission gaps, native validation defects, completeness, or security freshness.

## Verification
1. Current utility suite, existing AWS compatibility cases and newly selected IAM tests pass. Count root tests and named leaf cases separately.
2. Original core or IAM hook compiles with current tests but fails relevant ordering assertions; no setup or compiler failure is accepted as causal proof.
3. Combined patches apply cleanly to exact immutable source. Existing ordering prefix and unrelated source/configuration hashes remain unchanged when adding IAM support.
4. Inspect actual build logs and local image ID. Verify expected runtime components remain byte-identical except exporter; never infer configuration IID from arbitrary build-output digest type.
5. For private real-policy replay, require actual patched hook outputs converge for before/after pairs while keeping all raw documents in RAM. Report missing replay explicitly rather than inferring it from synthetic cases.
6. Report live exports, vulnerability scans, commits, pushes and deployment as unperformed unless separately authorized and evidenced.