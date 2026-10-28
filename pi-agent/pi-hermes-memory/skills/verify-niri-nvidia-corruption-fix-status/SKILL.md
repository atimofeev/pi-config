---
name: "verify-niri-nvidia-corruption-fix-status"
description: "Research whether Niri/NVIDIA scanout corruption was actually fixed, whether wait-for-frame-completion-before-queueing is still needed, and whether a Smithay buffer-lifetime workaround is in the installed stack."
version: 1
created: "2026-10-26"
updated: "2026-10-26"
---
## When to Use
Use when deciding whether a Niri NVIDIA corruption workaround can be removed based on upstream issue closure, driver updates, or Smithay changes. Research only; do not toggle displays or remove protections without approval.

## Procedure
1. Record running Niri commit, NVIDIA driver version, GPU renderer/scanout topology, and original reproduction conditions. Separate hybrid MST corruption from high-refresh single-GPU flickering.
2. Use authenticated gh to read original issue, duplicate parent, linked Smithay PR and NVIDIA issue. Follow engineering statements to a named shipped version; distinguish issue closure from a merged fix or verified release.
3. List recent NVIDIA repository release tags and inspect release notes for every relevant newer release, not just installed version. Data-center release notes explicitly may omit display-driver changes; qualify that coverage gap.
4. Verify source at the running Niri commit. Hash relevant local checkout files against GitHub tree blobs before trusting them. Read exact Cargo.lock Smithay revision and inspect its DRM compositor implementation or compare against workaround PR base.
5. Report confirmed fixed, confirmed still reproduced, or unverified separately. Match dates and versions for reproduction claims; link primary sources and explicitly qualify whether related symptoms share the same root cause.

## Pitfalls
- A GitHub stateReason of COMPLETED can reflect a hardware/driver issue closed for inactivity, not an implemented fix.
- An NVIDIA engineer announcing an internal solution for a future release is not evidence it shipped in a driver with a higher version number.
- Generic Blackwell display-scaling corruption or game-specific fixes are not evidence of retired-scanout-buffer synchronization fixes.
- An open unmerged Smithay PR may add an opt-in API that Niri must call; a dependency update alone does not enable it.
- Temporarily disabling MST outputs can trigger dock/power automation and invalidate simple A/B assumptions. Capture actual modes throughout and never promise recovery from output-on alone.

## Verification
1. Every claimed shipped fix has a named driver version or merged change with matching technical scope.
2. Installed-stack claims use the running commit's source and dependency pin, not an unrelated local checkout.
3. Final answer distinguishes absence of public evidence from proof of an unfixed bug and includes source links.