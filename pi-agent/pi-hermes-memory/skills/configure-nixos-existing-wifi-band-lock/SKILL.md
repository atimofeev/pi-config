---
name: "configure-nixos-existing-wifi-band-lock"
description: "Configure per-network 2.4GHz Wi-Fi band lock in NixOS while preserving an existing NetworkManager profile and password; replace router-side rejection and verify safe activation."
version: 1
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
Use when an existing imperative NetworkManager Wi-Fi profile needs band=bg but user wants policy enforced by NixOS without importing passwords into the store or duplicating profiles.

## Procedure
1. Read target repo AGENTS.md and applicable NixOS/JJ skills; locate host module and preserve baseline dirty files.
2. Inspect only profile ID, UUID, band and PSK flags; never print stored PSKs. Check NetworkManager modification permissions and sudo availability.
3. Verify current NixOS/NetworkManager docs: ensureProfiles writes full profiles rather than merging existing ones; wifi.band is not a supported connection default.
4. For preserving existing credential storage, add small host-specific oneshot unit ordered after/requiring NetworkManager.service and before network-online.target, wanted by multi-user.target, ExecStart nmcli connection modify named-profile 802-11-wireless.band bg, RemainAfterExit true. Do not suppress errors. This requires existing profile and is not full declarative credential provisioning.
5. Parse/evaluate module, build rendered unit only, run flake check --no-build; inspect actual generated unit and focused diff without full activation.
6. Warn reconnection may disconnect VPN. Apply live band lock to exact existing UUID, reconnect on target interface, verify profile unchanged and current frequency2.4GHz.
7. If user authorized router-rule removal, back up exact non-secret rule and guard unique MAC/interface/action/comment match. Send RouterOS brace block as ONE SSH command line: flatten newlines outside literals before transmission; multiline SSH commands may parse separately and lose locals. Verify rule count independently after removal.
8. Check gateway ping, failed-roaming logs, active VPN and external route. Clearly distinguish live persistent NM profile from unactivated NixOS unit. If sudo unavailable, provide privileged nixos-rebuild switch command rather than pretending service installed.

## Pitfalls
- Do not use ensureProfiles fragment as override; duplicate profiles or lost credentials may result.
- This oneshot depends on pre-existing profile; reinstall or renamed profile requires provisioning or updating selector. Removing/rolling back unit does not automatically clear persistently modified band property.
- RouterOS stdout success-looking messages and SSH exit0 can coexist with parser errors; independently verify final state.
- Do not silently restore guessed VPN profile after reconnection. Report disconnected VPN immediately; internet may now route directly.
- No unrelated power-save, SSID, channel, secret or VCS changes.

## Verification
1. Generated unit contains intended profile and band only; parse, targeted evaluation/build and flake checks pass.
2. Live profile UUID unchanged, single matching connection remains, band bg and active frequency2.4GHz; stored password remains usable without being read or exposed.
3. Exact rejected router rule absent and client registered on2.4GHz; new rejected roam events absent during stated observation period.
4. Report activation status, VPN state, observation-window limits and any privilege blockers explicitly.