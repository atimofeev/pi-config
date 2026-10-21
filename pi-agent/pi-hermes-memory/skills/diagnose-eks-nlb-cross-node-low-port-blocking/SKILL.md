---
name: "diagnose-eks-nlb-cross-node-low-port-blocking"
description: "Diagnose intermittent EKS internal NLB ingress timeouts when every DNS IP sometimes works, NodePort target health matches ingress pod placement, and Cluster traffic policy crosses node security groups missing TCP80/443."
version: 1
created: "2026-10-17"
updated: "2026-10-17"
---
## When to Use
Use for EKS instance-target NLBs forwarding to ingress NodePorts with externalTrafficPolicy=Cluster, particularly when healthy targets cluster on nodes hosting ingress pods. Investigation only until user approves remediation.

## Procedure
1. Identify actual datasource scheme/hostname without dumping credentials; inspect provisioning URL fields or read-only SQLite selecting datasource type and URL only.
2. From actual client network namespace, probe every NLB ENI IP repeatedly using curl --resolve, preserving Host/SNI and TLS verification. Record TCP/TLS timings, HTTP status and timeout stage. Treat expected401/redirects as transport success; do not confuse these with application health.
3. Snapshot Service traffic policy, target NodePorts, ready EndpointSlice pod addresses, ingress pod placement, NLB attributes/target health, subnet return routes, NACLs and VPN status. Avoid storing VPN customer configuration or PSKs; select only nonsecret fields.
4. Map destination pod secondary IPs to ENIs and all attached SGs. Evaluate destination container ports, not just NodePorts. EKS module recommended self rules may permitTCP1025-65535 andDNS53 while excluding ingress80/443.
5. Run bounded read-only curl commands inside existing ingress containers if permitted: own podIP80 versus peer podIP80 in both directions; HTTPS with proper --resolve and validation; peer10254/healthz as positive cross-node control when enabled. Do not install tools or create debug pods without approval.
6. Check namespace NetworkPolicies and AWS CNI network-policy enforcement flag. Compare findings: own80/443 success, peer80/443 timeout, peer10254 success, shared SG rejecting80/443, and Cluster policy explain local-only healthy nodes and random forwarding failures.
7. Recommend exact-port self-SG ingress80 and443 at EKS node_security_group_additional_rules boundary; never widen to80-443 range or internet-wide ingress. Do not apply during investigation. Preserve versions/backends and require reviewed real-backend plan before production apply.

## Pitfalls
- All frontend IPs can succeed and fail: DNS stickiness is not root merely because original report describes bad DNS IPs.
- NodePort allowed does not imply cross-node destination pod port allowed. Cluster-policy kube-proxy SNAT can change source from remote client subnet to forwarding node IP.
- An NLB only selecting currently healthy nodes can still fail when each chosen node sometimes selects a blocked remote endpoint; target-health snapshots and probes are not necessarily simultaneous.
- Pure TCP establishment timeout occurs before TLS/HTTP; do not attribute it to payload MTU without packet-level evidence.
- Current tunnelsUP does not validate on-prem IaC identity values; record unrelated config defects separately.
- No matching flow logs means no observed REJECT event. Distinguish static SG denial plus runtime controls from repair/retest confirmation; never claim successful remediation before approved fix and repeat probes.
- Honor SSH trust: use existing trusted key or request verified fingerprint/explicit TOFU permission; pin approved first key in temporary known_hosts rather than disabling checks.

## Verification
1. Capture actual client per-IP success/failure matrix and datasource timeout excerpts without credentials.
2. Confirm both pod ENIs' complete SG sets exclude self80/443 but allow positive-control port; verify routes/NACLs do not explain port-specific behavior.
3. Observe bidirectional cross-node low-port failure and working cross-node high-port control.
4. After separately approved narrow fix, repeat same matrices and target-health checks; Cluster-policy targets should become consistently healthy absent independent faults. Preserve evidence and rollback plan.