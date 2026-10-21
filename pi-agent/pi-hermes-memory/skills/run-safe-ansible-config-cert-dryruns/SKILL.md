---
name: "run-safe-ansible-config-cert-dryruns"
description: "Run safe Ansible nginx/configuration and certificate-delivery check/diff audits when check_mode:false tasks can mutate hosts, inherited role tags hide configuration tasks, or Vault URI GET skips in check mode."
version: 1
created: "2026-10-16"
updated: "2026-10-16"
---
## When to Use
User requests read-only Ansible drift or TLS-delivery checks against live hosts. Especially useful when package tasks override check mode, certificate sources require HTTP reads, or local SSH credentials differ from CI.

## Procedure
1. Read exact playbooks, role includes, handlers and selected inventory. Identify every check_mode:false task, local side effect, cleanup task and private-key copy; do not assume --check guarantees read-only execution.
2. Use explicit inventory and narrow --limit. Verify local SSH identity using existing local config; CI remote_user may depend on an unavailable CI-specific private key.
3. Use --list-tasks with intended tags and skips. Role-level tags propagate to every role task: skipping a package tag attached to entire role also skips config comparisons.
4. If needed, copy playbook into private temporary artifact directory, remove only inherited installation tag from role declaration, retain package task tags, and skip those task tags. Point roles/config to source via absolute paths; symlink template/files/vars/group_vars/host_vars directories for correct resolution. Verify exact temporary diff before execution; never edit repository to work around audit limitations.
5. Run original certificate playbook in --check to record limitations. If URI GET skips, temporary copy may set check_mode:false only on read-only GET and read-only freshness guards. Keep copy/file/reload/restart tasks in check mode; keep private-key tasks no_log and protect artifact permissions.
6. Audit live nginx with read-only nginx -t/-T, parsing only needed directives. Inspect public CRT issuer, SAN, dates and fingerprint; inspect key existence/permissions without printing or downloading keys. Probe SNI on intended listener and compare loaded fingerprint against disk.
7. Aggregate actual logs per host; distinguish successful, failed, unreachable and skipped scopes. Retry only specific transient gaps. Treat check-mode config validation as validation of installed config, not simulated candidate content.

## Pitfalls
- Check mode can execute real package installation, POST notifications or other mutations through check_mode:false.
- A zero-change recap is meaningless when --skip-tags excluded entire role or relevant tasks.
- Vault GET often lacks check-mode support; permit forced execution only for explicitly read-only source requests.
- Temporary playbooks outside repository can silently lose group_vars/host_vars or template search paths.
- Blackhole certificate in catch-all default_server does not imply named SNI vhosts use it.
- A raw audit may return sudo warnings before JSON; parse payload separately rather than dropping successful hosts.
- Blackhole key filename may differ from generic .crt-to-.key substitution; verify actual ssl_certificate_key directive before flagging missing key.

## Verification
1. Confirm selected task list includes all requested config comparisons and excludes unsafe installation tasks.
2. Inspect original versus temporary playbook diff; only explicitly approved audit-enabling changes appear.
3. Read command exits and every host recap; do not infer readiness for unreachable or omitted hosts.
4. Verify named vhost certificate SAN coverage, validity and loaded-versus-disk SNI fingerprint; distinguish default blackhole.
5. Report exact checked scope, actual differences, audit limitations and artifact paths; no live deploy or DNS changes unless separately authorized.