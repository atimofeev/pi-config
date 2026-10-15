---
name: "move-single-kafka-replica-under-disk-pressure"
description: "Move one Kafka partition replica off a nearly full broker while preserving replication and leadership; verify native reassignment, quotas and delayed source-directory cleanup, and handle user cancellation safely."
version: 1
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
Explicitly authorized single-replica Kafka reassignment for disk-pressure containment. Not for unapproved rebalancing, retention reduction, or manual file cleanup.

## Procedure
1. Confirm exact topic, partition, ordered current replicas, leader and ISR from a healthy broker. Choose an eligible destination absent from replica set with sufficient free space; validate configured racks/failure domains where known. Preserve leader order and replication factor.
2. Read current reassignment list and relevant topic/broker throttle settings. If original assignment changed or another migration conflicts, stop. Create a one-partition target JSON and preserve exact original assignment for rollback planning.
3. Execute native kafka-reassign-partitions once using a healthy broker. On verified Kafka versions supporting stdin JSON, stream --reassignment-json-file /dev/stdin without persistent remote files; otherwise use a private owned temporary file. Record timestamps, output and exit code. Do not retry an ambiguous submission.
4. Verify through --verify --preserve-throttles, topic replicas/ISR and --list. Do not remove or overwrite existing throttle settings. Under acute pressure a source replica can go offline while target still catches up from healthy leader; verify remaining ISR before continuing.
5. Confirm desired replica set, unchanged leader unless natural election occurred, full target ISR and cluster unavailable/under-replicated counts. Separately check source partition directory and disk space: completed metadata does not prove physical deletion finished.
6. If user postpones or revokes permission, immediately steer executor to stop before submission. If already submitted, perform read-only status checks; do not automatically cancel or roll back. Report precise submission/completion timing and whether source cleanup remains pending.

## Pitfalls
- Each copied replica needs transfer time; added volume capacity may be necessary before reassignment can reclaim space.
- No configured broker.rack does not prove physical failure domains are independent. Do not claim rack/AZ preservation without evidence.
- Ordinary --verify can remove broker/topic throttles after completion; --preserve-throttles avoids collateral mutations.
- Kafka may rename old partition to a UUID-suffixed -delete directory before asynchronous physical removal. Never delete it manually.
- Single-replica relocation preserves topic records but is not a root-cause fix for unexplained recent growth.
- Use runtime log.dirs per broker; mount paths differ even within one cluster.

## Verification
1. Exact execute output names only approved topic-partition and contains original rollback assignment.
2. Fresh metadata shows requested final replica set, all intended ISR, and expected leader.
3. Native reassignment list is empty for the operation and cluster health is checked.
4. Source cleanup and filesystem free space are measured separately; distinguish pending physical cleanup from completed reassignment.
5. No retention, replication-factor or unrelated quota/config changes occurred.