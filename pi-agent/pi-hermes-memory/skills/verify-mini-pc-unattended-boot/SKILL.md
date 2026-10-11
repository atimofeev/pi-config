---
name: "verify-mini-pc-unattended-boot"
description: "Research mini-PC BIOS/UEFI for homelab buying: verify UEFI PXE network boot, automatic startup after AC loss, board revisions, firmware support and shipped configuration."
version: 1
created: "2026-10-10"
updated: "2026-10-10"
---
## When to Use
Comparing used business desktops with N100/N150 mini-PCs for unattended Linux/Talos operation.

## Procedure
1. Identify exact product, board revision and BIOS version. CPU name or seller family label does not establish firmware capabilities.
2. Grade evidence per feature: manufacturer manual, model-specific firsthand BIOS/test, retailer claim, unknown. Distinguish Network Stack menu from proven UEFI PXE on onboard Ethernet, and AC-loss recovery from Wake-on-LAN.
3. Find exact firmware setting paths. HP often uses After Power Loss = Power on; AMI models may use State After G3 = S0 State. Require proof for actual shipped revision.
4. Compare equivalent RAM, SSD capacity/endurance, PSU, warranty and delivered price. Official Shopify product .js metadata can reveal variant-specific price and available:false; stale sold-out prices are reference only.
5. For PDFs, download under /tmp/pi-coding-agent/<task>/ and extract with pdftotext; on NixOS use ephemeral nix shell nixpkgs#poppler-utils if needed. Do not read binary PDFs as text.
6. Ask seller for BIOS version photo, UEFI PXE IPv4 boot entry, AC-recovery setting and cold-start video. Require official firmware source or recoverable backup path.
7. Acceptance-test new unjoined node: install chosen OS, confirm wired driver, boot without monitor, test orderly shutdown plus complete AC disconnect/reconnect, and PXE with actual provisioning setup. Preserve existing cluster/data.

## Pitfalls
- N100/N150 CPU rating is not whole-node wall power; low-load power depends on board, NICs and BIOS.
- UEFI boot support plus a generic PXE claim does not prove UEFI PXE. Auto Power On marketing may not define AC-loss behavior.
- Secure Boot may require Talos-specific key enrollment; Windows keys alone do not establish compatibility. Do not change existing encrypted nodes casually.
- Firmware options and component interfaces can change between visually identical revisions. Unknown feature support is not proven absence.

## Verification
1. Each recommended exact model has explicit evidence grade and links for both required firmware features.
2. Stock status and configuration accompany every price; shipping/import estimates remain separate.
3. Purchase checklist tests automatic start even when machine was powered off before AC cut, not only Last State behavior.