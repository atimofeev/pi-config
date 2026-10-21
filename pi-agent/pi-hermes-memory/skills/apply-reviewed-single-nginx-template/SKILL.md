---
name: "apply-reviewed-single-nginx-template"
description: "Apply a reviewed single nginx vhost/proxy_pass difference with Ansible when broad role has unsafe package tasks; gate on fresh full drift checks, source hashes, serial backups and nginx -t/reload, then verify zero drift and TLS."
version: 1
created: "2026-10-16"
updated: "2026-10-16"
---
## When to Use
User authorizes live rollout conditional on a previously reviewed single nginx configuration difference, while full role includes unnecessary or forced-live installation tasks.

## Procedure
1. Refresh full scoped nginx check/diff using safe installation exclusions. Inspect all host recaps and exact file diff; abort if any additional change, missing host, or failure appears. For read-only comparison only, use temporary parallel batch to avoid slow serial per-file checks.
2. Record hashes of reviewed template, inventory and relevant variables; recheck immediately before live apply. Stop on unexpected source changes.
3. Build private temporary Ansible wrapper outside repository that renders original absolute template into original destination with backup:true. Preserve source task ownership/mode semantics, original inventory and group_vars/host_vars discovery. No package roles, certificate delivery, DNS or unrelated templates.
4. Set hosts to authorized group, serial:1 and any_errors_fatal:true. Notify nginx -t handler before service state:reloaded handler; flush handlers before checking systemctl is-active nginx. Failed nginx validation must stop before reload and before next host.
5. Run wrapper --check --diff first and require exact same reviewed single-line difference across all intended hosts; then apply wrapper live with captured logs and retained per-host backup paths.
6. Inspect actual playbook, live diff and recaps. Run full scoped nginx --check --diff again, require zero drift, then verify nginx -t, service active and expected TLS SNI certificates on every host.

## Pitfalls
- Do not use parallelized comparison playbook for live rollout; retain serial1 and fail-fast behavior.
- Inherited installation tags can make --skip-tags omit entire role; inspect task selection and exclude forced-live package tasks safely.
- Temporary wrappers can lose inventory variables; link correct group_vars/host_vars and use explicit absolute inventory/config paths.
- nginx -t during check mode validates installed config, not unapplied candidate. Live handler validates after write but before reload; retain backup for recovery.
- Ansible handler changed counts are not counts of modified files. Native command nginx-t may report changed unless changed_when:false.
- Successful TLS probes do not prove upstream application health; report checked scope and leave DNS untouched unless separately authorized.

## Verification
1. Fresh full preflight and wrapper preflight show only authorized file/line changes on all hosts.
2. Source hashes unchanged before live write.
3. Live log shows serial template update, backup, successful nginx-t then reload and active service for each host.
4. Postapply full check/diff exits0 with changed0, failed0, unreachable0; TLS SNI probes match expected public certs.
5. Repository source, packages, certificate files, DNS and unrelated hosts remain untouched.