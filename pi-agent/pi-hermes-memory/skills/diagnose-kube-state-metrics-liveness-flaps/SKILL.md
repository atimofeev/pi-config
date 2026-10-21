---
name: "diagnose-kube-state-metrics-liveness-flaps"
description: "Investigate kube-state-metrics liveness HTTP 503 restarts and Argo Healthy/Progressing flaps after kube-prometheus-stack upgrades; distinguish API-dependent /livez failures from changed probes or version regressions."
version: 3
created: "2026-10-19"
updated: "2026-10-20"
---
## When to Use
Use for repeated kube-state-metrics liveness failures, brief Deployment unavailability, or monitoring-stack Argo health flaps. Diagnostic procedure only; do not loosen probes, roll back charts, or repair nodes without separate approval.

## Procedure
1. Capture timestamped Application health transitions, monitoring workload conditions, pod owners/UIDs, restart counts, last termination/start times, and pod events using explicit kubeconfig/context/endpoint and bounded requests. Distinguish container restarts from new ReplicaSet rollouts.
2. Correlate exact transition times with kube-state-metrics startup/readiness and other resources. Aggregate Application events alone do not prove which child caused historical health changes.
3. Read selected live liveness/readiness probes, resources, image, and args; exclude env/Secret contents. Compare exact old/new chart renders and tagged server code before calling behavior an upgrade regression.
4. Inspect bounded previous/current kube-state-metrics logs for 'Failed to contact API server for /livez: got <status>'. In tagged v2.18.0 and v2.20.0, /livez delegates to Kubernetes API /livez and returns503 on any client-go request error; /healthz returns200 locally. In v2.20.0, telemetry /readyz checks local metric gathering. Sources: https://github.com/kubernetes/kube-state-metrics/blob/v2.18.0/pkg/app/server.go#L519 and https://github.com/kubernetes/kube-state-metrics/blob/v2.20.0/pkg/app/server.go#L565 .
5. Separate delegated API non-success responses, authorization problems, and transport errors using actual logs/status plus API service endpoints and availability. A status code of0 alone does not distinguish DNS, network, TLS, cancellation, or other transport failures.
6. If useful and reachable, query bounded historical Prometheus up/restart/Deployment availability series around transitions. Missing history after ephemeral Prometheus replacement is not evidence of absence.
7. When API requests time out, stop blind retries; inspect read-only routing and at most a known alternate peer with TLS/cluster-identity checks. Report last successful collection time, blocked evidence, and uncertainty rather than declaring current cluster health.

## Pitfalls
- Kube-state-metrics liveness is not necessarily a local-process-only check. API failure can restart an otherwise running exporter.
- Repeated HTTP503 and kubelet Killing events establish real instability, but do not alone prove every Argo health transition or underlying API failure mechanism.
- Same probe path, thresholds, RBAC, and handler behavior across versions weaken claims that an upgrade introduced stricter probes; compare actual old/new renders.
- Timeouts from a laptop using a VPN route do not establish a cluster-wide API outage. Do not change VPN routes or kubeconfig merely to continue diagnostics.
- Do not mask failures by disabling probes, changing health endpoints, increasing thresholds, or forcing sync before assessing API health and intended policy.
- A successful point-in-time API readyz check does not exclude intermittent etcd heartbeat or ReadIndex stalls. Correlate KSM timestamps with API-server etcd deadlines and, when separately authorized, native etcd logs.
- Slow-disk diagnostic wording is not proof of hardware failure. Independently sample disk latency, I/O pressure, CPU and memory; map etcd and workload storage to actual devices. Shared rotational storage can impose latency without full disks or kernel I/O errors.
- Record actual log coverage. Talos may return only the latest minute even with a large --tail; do not claim older incident windows were covered.
- Etcd service logs can include Kubernetes request payloads and Secret data. Parse before persisting; allowlist safe timestamps/messages/durations/indices, and drop request, response, key, value, and auth payloads. Never save raw etcd logs during routine diagnosis.
- A node return is not a controlled before/after experiment: boot, cache warming, and storage replica rebuilding change load. Check current WO/rebuild status, compare defined observation windows, and distinguish immediate recovery load from steady-state storage limits.
- Recheck current restart counts and latest termination before reporting. Kube-state-metrics can restart while aggregate Argo health remains Healthy; an earlier agent snapshot may be outdated within minutes.
## Verification
1. Match resource lifecycle evidence to observed Application transition windows; explicitly label unmatched historical episodes.
2. Confirm delegated upstream response/error from relevant previous/current logs when claiming liveness root cause.
3. For any approved later remediation, verify stable Ready status, non-increasing restart count, successful API checks, and stable Application health across an appropriate observation window.
4. Preserve unrelated repository and cluster state; store only redacted selected evidence.