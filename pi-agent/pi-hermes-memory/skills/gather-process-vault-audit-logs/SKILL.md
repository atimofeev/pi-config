---
name: "gather-process-vault-audit-logs"
description: "Gather, recover, filter and redact Vault audit history across HA nodes. Handle nested or concatenated gzip archives, date/path filters, token and secret redaction, secure NDJSON export and explicit retention coverage."
version: 2
created: "2026-10-12"
updated: "2026-10-12"
---
## When to Use
Use for historical Vault access exports, compliance evidence or audit-log sharing, especially when old archives have repeated .gz suffixes or prior extraction reports many invalid JSON lines.

## Procedure
1. Establish requested UTC date bounds, request.path regex and redaction rules. Preserve existing exports; generate a separate version. Record one fixed end timestamp for the extraction.
2. Discover all relevant Vault hosts from inventory. Check runtime role/status, audit file descriptors and source file stats on each host. Historical logs can reside on former leaders; do not limit collection to current leader. Use existing least-privileged credentials only; never print or search broadly for tokens.
3. If authorized access exists, confirm runtime audit devices with vault audit list -format=json. File paths are configurable; map container mounts to actual host paths if applicable. Missing audit blocks in server HCL do not prove audit devices disabled. Keep TLS verification on, using valid TLS server name with exact target listener when needed. Stop API credential retries after invalid-token failure; OS file inspection may still work.
4. Inventory all retained audit sources on every relevant node, including live files and compressed rotations. Record size/inode/mtime and sample decoded first/last timestamps. Sample dates are provisional, not complete coverage. Audit entries' time fields—not filename/mtime—determine inclusion.
5. Detect compression by bytes, not filename. Stream gzip layers recursively until NDJSON is reached; validate each layer and member. Preserve unused_data/unconsumed_tail, handle concatenated gzip members and mixed gzip/plaintext tails explicitly. Test decoder on single/double/triple gzip, concatenated members, mixed tails and truncated streams. Never parse inner compressed bytes as JSON or silently skip nested archives.
6. Run resource-bounded streaming scans, preferably nice -n19. Open live file once, cap reads to initial size and record rotation/truncation races. Parse JSON and nanosecond timestamps, apply path/date filters, and count malformed lines/CRC failures without printing raw data. Only a final partial line can be treated as an expected live-file boundary; other failures limit completeness.
7. Redact on source host before writing or transfer. Mask authentication/client token and accessor fields even if already HMACed, token-bearing headers and token-return fields. Replace KV v2 response.data.data values with secret placeholders; account for KV v1 and other read-response payload shapes. Handle token-bearing request data per agreed scope. Preserve non-sensitive operational fields unless user asks otherwise.
8. Store only sanitized NDJSON and manifests in task-specific directories under /tmp/pi-coding-agent/<task>/ with directory0700/file0600. No raw secret-bearing temp copies. Download sanitized outputs, merge chronologically and deduplicate using stable canonical entry identity/digests with bounded-memory storage if needed.
9. Verify every exported record, not just samples: valid JSON, required path/date bounds, token/accessor/header redaction and read-payload placeholders. Produce per-source coverage/counts/errors plus final count, size, checksum and earliest/latest matching dates. State retention gaps explicitly; date filter starting years earlier does not prove retained history spans those years.

## Pitfalls
- Vault normally HMACs sensitive string values, including KV secret values, by default. log_raw=true or configured non-HMAC exemptions may expose plaintext. A field name like PASSWORD or an hmac-sha256 prefix alone does not demonstrate plaintext leakage. Treat raw logs as restricted regardless.
- An hmac-sha256 string in metadata is not necessarily a token. Validate specified token locations and secret payload boundaries; do not label all remaining metadata HMACs as uncensored authentication tokens.
- Audit devices are runtime/API configuration, not inferred from presence of an audit block in vault.hcl. Configuration listing does not by itself prove current file writes.
- Vault status/seal-status or health calls are not reliable audit-generation tests. Use observed production log growth or a known audited read request and correlate request ID when credentials allow.
- HA request handling and forwarding determine where records are emitted. Avoid claiming only leaders can audit; inspect every node for retained history and actual current writes.
- Outer gzip -t success validates only that layer. A repeated .gz archive can be healthy nested compression, not corruption; inner layers must be decoded and validated. Recompression cause must be established from historical evidence, not guessed from current logrotate.
- Never skip millions of invalid lines and report complete extraction. Binary compressed data misread as text can accidentally parse a few fragments; those are not trustworthy recovered records.
- A missing local log or stale standby file does not prove cluster audit disabled. Retention may exclude requested start date. Do not claim complete historical coverage without inventory, decoded source dates and gap analysis.

## Verification
1. Decoder synthetic tests pass for nested/concatenated gzip, mixed tails, corrupt/truncated inputs and bounded live-file reads; source-layer errors recorded precisely.
2. All output lines parse and satisfy actual request.path and normalized UTC date constraints; independently compute earliest/latest matching dates.
3. Every token/accessor/header field covered by policy is a placeholder; all protected read-response payload values are placeholders, including alternate response shapes.
4. Permissions0700/0600, sanitized-only transfer, per-source counts reconcile with deduplicated final counts; final checksum recorded and prior exports unchanged.
5. Coverage report distinguishes sampled versus fully scanned dates, no archives skipped silently, source errors/rotation races and missing retention disclosed.