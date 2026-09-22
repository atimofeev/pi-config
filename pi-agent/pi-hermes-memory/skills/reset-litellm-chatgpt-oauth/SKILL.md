---
name: "reset-litellm-chatgpt-oauth"
description: "Reset LiteLLM ChatGPT/Codex device-flow credentials and verify account switching safely"
version: 1
created: "2026-09-22"
updated: "2026-09-22"
---
## When to Use
Use when LiteLLM's chatgpt/* provider must switch OpenAI accounts, appears to retain an old subscription, or needs a clean device-code login.

## Procedure
1. Identify exact LiteLLM runtime, service user, and effective CHATGPT_TOKEN_DIR plus CHATGPT_AUTH_FILE. Resolve path inside service/container namespace; do not assume user ~/.config.
2. Inspect installed LiteLLM authenticator source/version to confirm token path and caching behavior. Never print token fields.
3. Stop every LiteLLM worker before touching auth state, preventing refresh or device-flow races.
4. Quarantine effective auth.json with timestamp instead of deleting it immediately. Record only a short SHA-256 hash of account_id when comparison is needed.
5. Restart one LiteLLM worker. Trigger device flow and authorize from a private browser signed into intended account.
6. Verify new auth file exists, required credential fields are present without printing values, and account_id hash differs.
7. Send direct chatgpt/<model> request with Responses API input as list to bypass model-group fallbacks. Confirm HTTP 200 and ChatGPT model headers.
8. After successful direct-provider canary, delete quarantined old credential if user requested.

## Pitfalls
- CHATGPT_AUTH_FILE is joined under CHATGPT_TOKEN_DIR unless absolute; deleting $HOME/.config may target wrong file.
- systemd DynamicUser StateDirectory commonly maps /var/lib/<service> through /var/lib/private and needs elevation.
- Running workers can refresh or recreate old auth file after deletion.
- Device login can reauthorize old browser account; use private/incognito browser signed into intended account.
- Model aliases may silently fall back to another provider. Verify with direct chatgpt/<model> call and response headers.
- LiteLLM Responses endpoint expects input as a list; string input may return `Input must be a list`.
- Treat auth.json, device codes, and JWTs as secrets. Never print or persist them in logs.

## Verification
1. Service is active and listens on configured address.
2. New auth.json exists at effective runtime path.
3. New account_id hash differs from old hash when both are available.
4. Direct chatgpt/<model> request returns HTTP 200 without fallback.
5. Old quarantined credential is removed only after successful verification and explicit approval.