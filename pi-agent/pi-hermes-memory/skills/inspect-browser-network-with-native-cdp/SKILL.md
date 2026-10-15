---
name: "inspect-browser-network-with-native-cdp"
description: "Verify actual HTTP and WebSocket URLs in a web app with headless Chromium and Node CDP, without Playwright/Puppeteer; capture handshake101 and frame counts, inspect same-process iframe contexts."
version: 1
created: "2026-10-14"
updated: "2026-10-14"
---
## When to Use
Use for read-only web-app network investigations when Chromium and modern Node with global WebSocket/fetch are present but browser automation libraries are unavailable. Suitable for mixed HTTP/WebSocket route verification; not for private authenticated sessions or modifying application data.

## Procedure
1. Create a mode700 task directory under /tmp/pi-coding-agent/<task-name>; use a fresh browser profile inside it.
2. Launch headless Chromium with sandbox enabled, --disable-extensions, --no-first-run, --disable-default-apps, --disable-background-networking, --remote-debugging-address=127.0.0.1 and --remote-debugging-port=0. Read DevToolsActivePort and /json/version to connect to browser CDP via Node global WebSocket.
3. Enable flattened Target auto-attach recursively; enable Network and Runtime on each attached session, then resume targets waiting for debugger. Track Runtime.executionContextCreated default contexts per session, including same-process iframe contexts.
4. Record sanitized Network.responseReceived URL/type/status and WebSocket created URL, handshake status, and sent/received frame counts. Never log payloads, cookies, Authorization or query tokens. Deduplicate per target/request.
5. Navigate the supplied page. Inspect each default execution context using Runtime.evaluate(contextId), not only top-level targets. Dismiss a known informational overlay only if necessary and navigate one clearly identified display-only item; never click betting, login or account controls.
6. If UI does not reach the desired socket, inspect public script imports and actual socket path construction. Test the derived endpoint with a bounded native WebSocket connection; an opening Engine.IO packet proves Socket.IO transport reachability but not authenticated application functionality.
7. Run long captures via bg_run owned by the parent that will review results, with a hard deadline and cleanup of the owned browser. Await the terminal notification and inspect the actual sanitized artifact before reporting conclusions.

## Pitfalls
- A fresh user-data directory may still receive system-configured extensions; --disable-extensions avoids startup pages and unrelated traffic.
- CDP target enumeration misses same-process iframe documents; collect Runtime execution contexts as well as OOPIF targets.
- A general application WebSocket is not evidence for a feature-specific socket. Distinguish paths and verify the feature route explicitly.
- Static bundle support shows possible routes, not observed use. Label static construction, browser-observed traffic and direct handshake tests separately.
- Having a child agent launch a background capture can produce an agent completion before evidence exists. Prefer child preparation plus parent-owned bg_run.
- Do not infer all traffic under a prefix is WebSocket or HTTP from one connection. Mixed HTML, assets, APIs and sockets are common.

## Verification
1. At least one relevant WebSocket has handshake101 or a successful native opening event, ideally with protocol opening packet or frames counted.
2. HTTP APIs are distinguished from documents/assets and sockets; scope limitations and UI interaction are recorded.
3. Actual artifact is reviewed and all capture-owned browser processes are closed.
4. No sensitive request headers, payloads or query identifiers are emitted.