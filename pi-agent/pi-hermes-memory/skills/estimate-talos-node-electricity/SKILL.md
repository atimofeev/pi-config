---
name: "estimate-talos-node-electricity"
description: "Estimate Talos homelab electricity use via talosctl read-only Intel RAPL psys energy counters; distinguish platform power from AC wall power."
version: 1
created: "2026-10-09"
updated: "2026-10-09"
---
## When to Use
User asks to estimate electricity cost from current Talos node workload; not for exact billing or production changes.

## Procedure
1. Read Talos skill. Discover configured endpoints and members with read-only talosctl commands; avoid dumping credentials or machine configs.
2. Read /sys/class/dmi/id/product_name and /proc/cpuinfo to identify actual hardware.
3. Discover Intel RAPL domains under /sys/devices/virtual/powercap. Read name and max_energy_range_uj; distinguish psys from package domains.
4. Read psys energy_uj twice per node with monotonic timing and 30–60 seconds between samples. Sample nodes concurrently; use timeouts. Watts = wrapped microjoule delta / 1e6 / elapsed seconds.
5. Compute monthly energy as watts / 1000 × 24 × days. Use verified marginal electricity tariffs if available; otherwise label assumed rate. Explicitly qualify domain coverage and AC conversion.

## Pitfalls
- RAPL psys coverage and calibration vary; not verified whole-system or AC wall power. Never sum overlapping package and psys domains.
- CPU utilization, CPU TDP, and adapter ratings do not establish wall watts. PSU efficiency assumptions cannot correct unmeasured components.
- Short energy-counter sample produces temporal mean, not long-term median. For energy costs use long-term mean; external meter validates wall power.

## Verification
1. Confirm numeric counters increase or correctly account for rollover; print domain labels, raw readings and elapsed time.
2. Repeat longer sample to check order of magnitude. No writes or cluster changes needed.
3. Report measured platform watts separately from provisional wall-power and tariff assumptions.