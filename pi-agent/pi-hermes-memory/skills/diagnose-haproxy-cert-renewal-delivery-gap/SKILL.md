---
name: "diagnose-haproxy-cert-renewal-delivery-gap"
description: "Diagnose HAProxyTLSCertificateExpiresSoon when Certbot renews automatically but HAProxy still serves old cert; compare served expiry, issuer logs, Vault push and scheduled CI delivery timestamps."
version: 1
created: "2026-10-12"
updated: "2026-10-12"
---
## When to Use
Use for certificate expiry alerts with separate issuance, secret-store publication and host deployment. Read-only diagnosis first.

## Procedure
1. Map alert host to certificate inventory, probe SNI and delivery playbook. Read expiry alert threshold and delivery schedule.
2. Probe each configured SNI directly. If openssl missing, Python ssl can retrieve public DER certificate, hash SHA-256 and decode certificate using temporary PEM. Unverified TLS retrieval identifies served certificate; it does not prove trust.
3. Read issuer certificate expiry and latest relevant renewal log block. Filter exact domain block, not first matching block or generic tail. Check deploy-hook result; stderr logging alone does not mean hook failure.
4. Query authenticated CI API for active schedule, latest delivery job and host-specific tasks. Keep job trace under /tmp/pi-coding-agent/<task-name>/ and print only relevant evidence.
5. Compare issuance/publication time against deployment completion time. Successful delivery before renewal plus old served certificate establishes pending delivery gap; label future clearing as expected, not verified.
6. Report expiry, chronology, next scheduled deployment and explicit verification limits. Do not trigger renewal, CI jobs or reloads without authorization.

## Pitfalls
- Expiry warning at renewal threshold can fire normally before next deployment; do not infer renewal failure from alert alone.
- SSH denial on consumer does not imply issuer inaccessible. CI host task evidence can verify prior delivery/reload without direct consumer access.
- Never print private keys, Vault tokens, AppRole secret IDs or unfiltered credential-bearing files.
- Private stdlib ssl._ssl._test_decode_cert is diagnostic fallback, not production API.

## Verification
1. Identify exact expiring certificate by served SNI.
2. Collect issuer renewal and successful publication evidence.
3. Collect latest delivery job result and host-specific loaded-versus-disk verification.
4. State whether certificate rollout completed or remains pending.