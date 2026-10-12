---
name: "gather-process-vault-audit-logs"
description: "Extract, filter, and censor Vault audit logs for compliance or analysis: gather logs from active node, filter by request.path and time range, censor KV secret values and optionally token hashes, output secure NDJSON."
version: 1
created: "2026-10-12"
updated: "2026-10-12"
---
## When to Use
Use when you need to analyze Vault audit activity for a specific subset of paths (e.g., dev/, prod/) over a historical period, while ensuring no plaintext secrets are exposed in the output. Typical use: security audits, compliance evidence, troubleshooting specific application access patterns.

## Procedure
1. Identify the active Vault node (leader) in the HA cluster: run `vault status -format=json` and check `ha_enabled` and `active_time` or use `vault operator raft list-peers` if available. Alternatively, check which node has the newest audit log file modification time.
2. Ensure you have SSH access (or local console) to the selected node with sudo privileges to read /var/log/vault/* and run Vault CLI commands.
3. Verify the audit device configuration on that node: run `VAULT_ADDR=<local listener> VAULT_SKIP_VERIFY=false vault audit list -format=json` (using existing root token if needed) to confirm a `file/` type audit device pointing at `/var/log/vault/vault_audit.log`. If the command fails due to token permissions, you can still proceed by directly inspecting the log files.
4. List source audit files: `ls -lt /var/log/vault/vault_audit.log*` to see the live log and rotated archives (including nested .gz files if logrotate has recompressed them). Note file sizes and modification times.
5. Write a Python 3 script (or use a combination of shell tools) to: a) Read each source file (live log as plaintext, .gz files via gzip decompression). b) Parse each line as JSON; skip lines that fail to parse. c) Keep only entries where `request.path` exists and matches the desired regex (e.g., `^dev/.*`). d) Keep only entries whose `time` field is within the desired inclusive range (parse ISO8601 timestamps). e) Censor sensitive data: replace all values in `response.data.data` (if present and a dict) with the placeholder `__CENSORED_SECRET__`. Optionally, replace any string value that begins with `hmac-sha256:` with `__CENSORED_TOKEN__` to mask token hashes. f) Write each filtered, censored entry as one line of NDJSON to an output file.
6. Run the script on the host, directing output to a secure location (e.g., `/tmp/vault_audit_dev_extract.jsonl`). Ensure the file is created with restrictive permissions (e.g., `chmod 600`).
7. Validate the output: confirm the file exists, every line is valid JSON, each entry's `request.path` matches the regex, and no plaintext secret values appear in `response.data.data` (sample-check). If token hashes were censored, verify they are replaced.

## Pitfalls
- Nested gzip archives (e.g., `vault_audit.log.8.gz.8.gz`) result from logrotate's `compress` directive acting on already‑gzipped rotated logs; these files contain binary gzip data, not plaintext JSON lines, and will appear as massive numbers of invalid JSON lines when read line‑by‑line. They must be skipped or handled with double decompression if you need to recover very old entries.
- Concurrent writes to the live audit log can produce truncated lines at the end of the file; a line‑by‑line reader will see those as invalid JSON. This is normal and does not indicate corruption—simply skip invalid lines.
- The `file/` audit device does **not** hash KV secret values; any `kv read` (or `kv list` with data) writes the actual secret into the log file in plaintext. Treat the audit log as sensitive as the secrets themselves.
- In an HA Vault cluster, only the **active** node currently writes to its audit log file; standby nodes may have stale logs. Verify you are reading from the leader, or aggregate logs from all nodes if you need a complete picture.
- Attempting to run `vault audit list` or other API calls may fail with "permission denied" or "invalid token" if the available token (e.g., `/root/.vault-token`) lacks sufficient capabilities or is expired. The `vault status` endpoint is often unauthenticated and can still confirm the node is unsealed and HA‑enabled.

## Verification
1. Check that the output file exists and is owned by the executing user with permissions `0600` (or stricter).
2. Run a validation script (or one‑liner) that: a) reads each line, b) attempts `json.loads`; counts and reports any lines that fail. c) verifies `request.path` matches the required regex for every entry. d) spots‑checks a sample of `type=response` entries to ensure all values in `response.data.data` equal the censorship placeholder (e.g., `__CENSORED_SECRET__`). e) optionally, verifies that no string value begins with `hmac-sha256:` if you chose to censor token hashes.
3. Confirm that the time range of the entries matches the requested bounds by examining the minimum and maximum `time` values in the output.
4. If possible, compare the line count of the output to the number of lines that satisfied the filters in a dry‑run (e.g., using the same script but writing to `/dev/null` and counting matches) to ensure no matches were missed due to script errors.