---
name: "research-router-wifi-antenna-mod"
description: "Research external Wi-Fi antenna modifications on routers with internal antennas: verify exact board model, teardown photos, RF test sockets versus U.FL, MIMO feeds, and regulatory limits before proposing parts."
version: 1
created: "2026-10-13"
updated: "2026-10-13"
---
## When to Use
Use for feasibility and parts research when adding external antennas to routers without documented antenna ports. Not a substitute for board-level RF measurements or connector identification.

## Procedure
1. Confirm exact product code, stock antenna gains, and radio-chain counts from manufacturer specs; chain count alone does not establish number of antenna feeds.
2. Find exact-model modification reports and PCB photos. Keep related-model evidence explicitly separate; reported throughput is not proof of connector compatibility.
3. When web tools cannot inspect linked PCB images, download exact image into task artifact directory and inspect with image-capable read tool. Confirm source context establishes model.
4. Identify whether socket is antenna connector or switched manufacturing RF test port. Require dimensions, marking, datasheet and feed mapping before naming compatible pigtail; visually similar sockets need not mate.
5. Explain conditional adapter and RF-rework routes; preserve stock-path isolation, 50-ohm geometry and MIMO. Check current driver country/gain semantics and local certification constraints. State unresolved parts rather than fabricate shopping list.

## Pitfalls
- Do not treat U.FL, Murata switch sockets, I-PEX MHF-SW variants or vendor 'MS156' labels as interchangeable.
- Do not infer shared dual-band feeds solely from two spatial antenna areas or two chains per radio.
- External antenna gain can be offset by coax loss, pattern nulls and mandatory transmit-power reduction; cosmetic antenna size does not imply improved coverage.
- Avoid exact solder points or trace cuts without verified board revision and RF circuit evidence.

## Verification
1. Answer separates official specifications, inspected photos, community reports and inference.
2. Exact connector recommendation includes compatibility evidence; otherwise explicitly unresolved.
3. Sources support each model-specific claim; proposed performance gains remain estimates without controlled before/after tests.