---
name: "diagnose-linux-reboot-time-skew"
description: "Diagnose Linux reboot/crash/resume incidents when uptime, journal boot order, or timestamps disagree; compare system clock, /proc uptime, journal boots, and kernel/service logs to find real event order and likely trigger."
version: 1
created: "2026-05-19"
updated: "2026-05-19"
---
## When to Use

Use when investigating Linux reboot/crash/resume incidents where:

- `uptime` conflicts with expected boot time.
- `journalctl --list-boots` order or timestamps look impossible.
- System clock changed after boot, hibernate/resume, VM snapshot, or NTP correction.
- Need determine whether reboot, suspend/resume, kernel panic, service crash, or clock skew happened.

Do not use for ordinary service failures with consistent clocks and no boot-boundary ambiguity.

## Procedure

1. Capture current reference points first.
   - `date --iso-8601=seconds`
   - `cat /proc/uptime`
   - `uptime`
   - `cat /proc/sys/kernel/random/boot_id`
   - `timedatectl` when available

2. List journal boots with stable identifiers.
   - `journalctl --list-boots`
   - Note boot offsets, boot IDs, first/last wall-clock times.

3. Compare wall-clock vs monotonic time.
   - Use Unix timestamp output to avoid locale/date parsing errors: `journalctl -b 0 -o short-unix -n 5`, `journalctl -b -1 -o short-unix -n 20`.
   - If available, include monotonic output: `journalctl -b 0 -o short-monotonic -n 20`.
   - Convert suspicious epoch values with `date -d @<epoch>`.

4. Find boot boundary.
   - Last entries from previous boot: `journalctl -b -1 -o short-unix -n 100`.
   - First entries from current boot: `journalctl -b 0 -o short-unix | head -200`.
   - Kernel-only boundary: `journalctl -k -b -1 -o short-unix -n 200` and `journalctl -k -b 0 -o short-unix | head -200`.

5. Search for crash/panic/OOM/watchdog/GPU/scheduler clues near boundary.
   - `journalctl -b -1 -o short-unix | rg -i 'panic|oops|BUG:|watchdog|hung|oom|out of memory|NVRM|gpu|segfault|fatal|abort|thermal|mce|hardware error|scx|sched'`
   - Repeat on current boot for recovery messages and device reinitialization.

6. Reconcile impossible timestamps.
   - Treat `date` + `/proc/uptime` as current ground truth.
   - If `/proc/uptime` says minutes but `uptime` says months, suspect userspace boot-time calculation, stale utmp, RTC/NTP jump, suspend/hibernate accounting, or journal time skew.
   - If previous boot appears to end after current boot starts, report clock skew explicitly; order by boot ID and monotonic order inside each boot, not wall-clock alone.

7. Produce incident timeline.
   - Current time and real uptime from `/proc/uptime`.
   - Reported uptime from `uptime` if conflicting.
   - Previous boot last log timestamp.
   - Current boot first kernel timestamp.
   - Crash/panic/service failure timestamp and exact error line.
   - Confidence notes: which timestamps are trusted and which are skewed.

8. Save compact handoff when useful.
   - Include commands run, key excerpts, conversions, and unresolved contradictions.
   - Avoid dumping whole journal; keep boundary excerpts and relevant matches.

## Pitfalls

- `uptime` can mislead when boot-time source is affected by clock jumps or stale accounting. Cross-check `/proc/uptime`.
- Journal wall-clock order can be wrong after RTC/NTP correction, hibernate/resume, or VM snapshot restore. Use boot IDs and monotonic ordering.
- `journalctl -b -1` may fail if persistent journal is disabled or previous boot logs were vacuumed.
- `head` on `journalctl` can terminate pipe with benign broken-pipe noise. Ignore if desired output appeared.
- GPU driver errors (`NVRM`, amdgpu/i915), eBPF scheduler (`scx*`), OOM, and panic lines may appear before final reboot boundary; inspect minutes before last previous-boot entry, not only final lines.
- On NixOS or minimal systems, commands may be absent or shell path may differ; run missing tools via Nix when needed.

## Verification

Pass when report includes:

- Current wall-clock time and `/proc/uptime` seconds.
- `uptime` output, with conflict called out if present.
- Current boot ID and `journalctl --list-boots` summary.
- Previous boot last entry and current boot first entry, preferably in Unix timestamp format.
- Converted epoch times for suspicious events.
- Relevant crash/panic/OOM/driver/service errors near boundary, or explicit statement none found.
- Clear conclusion separating proven facts from timestamp-skew inference.