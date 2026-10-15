---
name: "diagnose-wifi-rejected-band-roaming"
description: "Debug intermittent laptop Wi-Fi when MikroTik rejects 5GHz but same SSID remains on both bands: correlate Linux roaming logs, NetworkManager band lock, power save, RF width, and gateway latency."
version: 2
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
Use when Linux laptop alternates between stable and poor Wi-Fi, especially after router-side band denial with shared SSID. Perform read-only diagnosis before changing connection settings.

## Procedure
1. Identify active NetworkManager Wi-Fi interface and gateway; inspect profile band/BSSID/powersave without showing passwords. Verify target machine is affected laptop.
2. Read cached AP list with nmcli device wifi list --rescan no; map BSSIDs to frequencies. Use iw link, info, get power_save and station dump; NixOS fallback nix run nixpkgs#iw --.
3. Correlate kernel events for disconnect from current AP for new auth, authentication rejection, and fallback association. Router-side rejection does not prevent client leaving working band.
4. Measure gateway ping separately from internet ping and inspect routing: external samples through VPN cannot isolate Wi-Fi or ISP. Short good sample does not refute intermittent failure.
5. Check 2.4GHz actual width and center frequency versus nearby channels. Cached signal and overlap indicate interference risk, not airtime utilization proof. Treat power saving as secondary hypothesis until A/B tested.
6. Read router access-list and steering settings only through trusted connection. Never disable SSH host-key verification to access unknown router key.
7. Propose client band=bg lock as first isolated A/B test when rejected 5GHz roaming proven; verify NetworkManager docs. Warn reconnect may interrupt VPN and obtain consent; record old values, then test before adjusting power save or channel width.

## Pitfalls
- Do not infer router band steering solely from client roaming logs; client chooses association and steering trigger may remain unknown.
- iw station counters of zero may reflect driver unsupported accounting, not proof of no retries.
- Avoid live scans during latency samples; scanning can itself disrupt traffic.
- Do not blindly bind BSSID if band lock suffices; hard BSSID disables roaming/background scanning and complicates AP replacement.

## Verification
1. Each alleged band transition maps to known BSSIDs/frequencies and exact timestamped logs.
2. When trusted router access exists, verify enabled access-list action=reject targets affected client MAC and correct radio. Correlate match-count with logged rejection attempts; count agreement supports cause but does not prove steering trigger.
3. Report signal, PHY rates, gateway loss/latency, VPN route and observation-window limits. Do not treat sparse cached AP list as channel-utilization measurement.
4. Distinguish automatic channel selection from band roaming. Check effective channel reselect settings against documented defaults; empty steering profile table alone does not establish effective default feature state.
5. Any proposed change is isolated, reversible and verified against current docs; reconnect warning explicit.