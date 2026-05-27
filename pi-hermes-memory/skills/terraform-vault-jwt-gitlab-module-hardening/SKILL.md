---
name: "terraform-vault-jwt-gitlab-module-hardening"
description: "Refactor or build Terraform module for Vault GitLab JWT auth roles/policies with strict scope selection (project_id XOR group_paths), claim normalization for vault provider map(string), and per-role policy generation."
version: 1
created: "2026-05-19"
updated: "2026-05-19"
---
## When to Use
- Building/refactoring Terraform module that provisions `vault_policy` + `vault_jwt_auth_backend_role` for GitLab CI JWT auth.
- Need strict auth scope selector: exactly one of `project_id` or `group_paths`.
- Need provider-compatible claim encoding because Vault provider exposes `bound_claims` as `map(string)`.
- Do not use for non-Vault auth backends or modules without role/policy fan-out.

## Procedure
1. Define validated inputs.
   - `project_name` non-empty string.
   - `project_id` nullable string.
   - `group_paths` list(string), default empty.
   - `roles` map/object describing per-role paths/capabilities/refs.
2. Compute scope selector locals.
   - `scope_uses_project_id = var.project_id != null`
   - `scope_uses_group_paths = length(var.group_paths) > 0`
   - `scope_selector_valid = scope_uses_project_id != scope_uses_group_paths` (XOR)
3. Normalize group scope claims for provider limitation.
   - Trim inputs.
   - Build group glob/path claim value.
   - Encode multi-value claims as comma-separated string when provider requires `map(string)`.
4. Normalize role model in locals.
   - Merge defaults (TTL, token type, refs).
   - Precompute resolved policy paths/capabilities per role key.
5. Create `vault_policy` with `for_each = var.roles`.
   - Generate policy text from normalized paths via heredoc + `jsonencode(capabilities)`.
6. Create `vault_jwt_auth_backend_role` with `for_each = local.normalized_roles`.
   - Add `lifecycle.precondition` using `local.scope_selector_valid`.
   - Error text: exactly one selector must be set.
   - Set `bound_claims` based on chosen scope (`project_id` or group claim string).
   - Attach generated policy name for matching role key.
7. Add outputs for operability.
   - Map role key -> policy name.
   - Map role key -> jwt role name.
8. Update README.
   - Include selector rule (XOR), provider claim-string caveat, and examples for both scope modes.

## Pitfalls
- Setting both `project_id` and `group_paths` (or neither). Fix: enforce XOR in locals + precondition.
- Passing list directly to `bound_claims`. Provider expects `map(string)`, causes type mismatch. Fix: normalize to string form.
- Untrimmed/null-like values in group paths produce bad claim matching. Fix: trim/filter early.
- Role key drift between policy and jwt role resources breaks references. Fix: drive both from same normalized map keys.

## Verification
- `terraform fmt -check` passes.
- `terraform validate` passes for valid selector config.
- `terraform plan` with only `project_id` passes.
- `terraform plan` with only `group_paths` passes.
- Negative test: set both/none; plan fails with precondition message about exactly one selector.
- Outputs `policy_names` and `role_names` resolve map entries for each role key.