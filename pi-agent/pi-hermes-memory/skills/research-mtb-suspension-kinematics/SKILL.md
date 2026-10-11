---
name: "research-mtb-suspension-kinematics"
description: "Research why mountain bikes feel different downhill: model-year-specific leverage curves, progression, anti-rise, wheels, shock tune and sag."
version: 1
created: "2026-10-04"
updated: "2026-10-04"
---
## When to Use
Comparing suspension feel between specific mountain bike models and years. Separate chassis kinematics from component setup; do not infer rider-specific causes without actual shock and tire settings.

## Procedure
1. Identify exact model year, wheel size, trim, travel, shock dimensions and any redesign boundary. Contemporary launch reports help distinguish same-name generations.
2. Fetch contemporary specifications and ride tests. Linkage Design (linkagedesign.blogspot.com/search?q=<model>) can supply independent modeled leverage and anti-rise curves; verify applicability to requested year.
3. Fetch direct article permalink. Inspect leverage graph images when curve shape matters; images can be downloaded under /tmp/pi-coding-agent/<task-name>/ and read.
4. Define leverage ratio as wheel displacement per shock displacement. State progression convention explicitly, e.g. (initial LR - final LR) / initial LR. Label simulation results as modeled, not laboratory measurements.
5. Explain early-stroke versus sag-region response, midstroke support and bottom-out resistance separately. Evaluate wheel rollover, geometry, fork balance, tire casing/pressure, shock tune, rebound packing and service condition as separate factors.
6. Include contrary ride-test evidence and uncertainty. Ask for actual components/settings before recommending rider-specific changes.

## Pitfalls
- Do not substitute adjacent model years or different wheel-size versions. Same-year trim can alter shock stroke and travel.
- High initial leverage does not guarantee superior small-bump compliance around sag. Air pressure, negative spring, damping, friction and curve shape matter.
- Different authors use different progression denominators. State formula rather than compare unlabeled percentages.
- Anti-squat depends on gear and rider assumptions; it does not explain general downhill support while coasting. Anti-rise affects braking response and is not a standalone grip score.
- More air-volume spacers primarily change deeper-stroke ramp-up; they do not reproduce another frame's full leverage curve.
- Search APIs may lack credentials. Fetch known source URLs or use available search fallback rather than repeatedly retrying broken providers.

## Verification
1. Every numerical comparison has fetched model-specific evidence or clearly labeled calculation.
2. Requested generation and shock stroke match curve being cited.
3. Graphs and reported endpoints agree; claims distinguish modeled data from manufacturer claims and ride impressions.
4. Answer includes source URLs, contrary evidence and missing rider-specific settings.