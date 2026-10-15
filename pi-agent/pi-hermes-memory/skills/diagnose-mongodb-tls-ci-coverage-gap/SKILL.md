---
name: "diagnose-mongodb-tls-ci-coverage-gap"
description: "Diagnose MongoDBTLSCertificateExpiresSoon despite successful CI: compare served certificates, inventory coverage, PKI TTL, renewal ownership and certificate reload paths."
version: 3
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
MongoDB TLS expiry alert where scheduled certificate jobs appear successful. Read-only diagnosis first; production renewal and reload require authorization.

## Procedure
1. Probe exact inventory hostnames and MongoDB port using matching SNI; collect UTC notBefore/notAfter, issuer, subject, SANs and SHA256 fingerprint. Public diagnostic retrieval without validation does not prove trust.
2. Find alert expression and determine whether metric measures served leaf/chain or on-disk certificate. Compare remaining lifetime against warning and critical thresholds.
3. Trace certificate source and owner: legacy MongoDB role, Vault PKI CSR signing, Vault KV delivery or external files. Inspect CI target groups and host_tls_certificates definitions; successful job may exclude affected nodes.
4. Read authenticated CI schedule details and latest job recap through GET-only API. Print selected non-secret metadata; save traces with mode 0600 under task-specific /tmp/pi-coding-agent directory.
5. Compare requested TTL with observed lifetime and issuer role limits; align renewal window with effective TTL. Do not infer one-year validity merely from requested 8760h.
6. If SSH host identity is verified, inspect disk public cert metadata and loaded service state without reading key material. Unknown host key blocks direct SSH; do not bypass verification.
7. For emergency renewal, use narrow certificate tasks and inspect --list-tasks first. Confirm credential targets and protect PEM backups. Tagged TLS copy may omit untagged MongoDB restart tasks.
8. Load renewed files via supported rotateCertificates on each MongoDB process or rolling restart: secondaries sequentially with health checks, then primary step-down and old-primary restart. Preserve CA, O/OU/DC membership, SANs and cert paths.
9. For permanent automation, configure certificates and inventory membership together, remove competing issuance ownership, and serialize production replica-set reloads. Validate live expiry after rollout and next scheduled reconciliation.

## Pitfalls
- Prefer existing certificate signer and CI job when host enrollment plus certificate definitions can satisfy requirements. Separate Mongo pipeline is optional architecture, not prerequisite; evaluate small serialization/activation changes before proposing new orchestration.
- Adding inventory hosts alone does not help when certificate list defaults empty; reconcile role may succeed without changing anything.
- Never run whole multi-role MongoDB install playbook just to renew TLS: storage, packages, replica-set configuration and other services may change.
- Existing legacy certificate deployment sets a changed fact but may not notify restart. Reaching end of tagged playbook does not imply mongod loaded certificate.
- MongoDB x509 replication requires matching membership attributes across old/new certs during rolling transitions; copying another cluster definition without checking issued subject is unsafe.
- Daily per-host restart commands without serial coordination can restart replica-set members concurrently; add serialization and cross-run locking or use verified live certificate rotation.
- Requested TTL above issuer cap may be rejected or reduced; verify actual behavior rather than assume either outcome.
## Verification
1. Same public-certificate evidence captured per affected host and CI recap independently confirms scope.
2. New served certificate expiry extends beyond alert threshold; SANs and membership attributes preserved.
3. Replica set has one PRIMARY, expected SECONDARY members, healthy replication and successful fresh TLS connections.
4. Next scheduled job explicitly covers affected hosts and safely skips certificates outside renewal window.
5. When validating inventory outside the playbook directory, pass ansible-inventory --playbook-dir <directory> so sibling group_vars load. Assert certificate definitions as well as target host count.
6. For existing restart-based delivery, verify serial execution, cross-job locking, and a direct TLS hello probe that waits for PRIMARY or SECONDARY after each changed Mongo host. Syntax checks alone do not verify service readiness.