---
name: "diagnose-cognito-federated-sso-readonly"
description: "Diagnose suspected missing or broken Google SSO in AWS Cognito with read-only pool/client inventory and unauthenticated OAuth redirects, distinguishing IdP removal from application routing failures."
version: 1
created: "2026-10-14"
updated: "2026-10-14"
---
## When to Use
Use when an application allegedly lost Cognito federated SSO and read-only inspection is authorized. This does not validate end-to-end login without an authorized test account.

## Procedure
1. Confirm the requested AWS profile/account and region. Query only relevant Cognito pools, domains, app clients and identity providers; never enumerate users or output client secrets.
2. Inspect SupportedIdentityProviders, AllowedOAuthFlowsUserPoolClient, AllowedOAuthFlows, AllowedOAuthScopes and exact CallbackURLs. Separate a dedicated password-only pool from an existing federated pool.
3. For the relevant exact callback, send a credential-free GET to the Cognito /oauth2/authorize endpoint with client_id, identity_provider, response_type=code and allowed scopes. Do not follow the redirect to the external identity provider; record status, Location hostname/path and errors, excluding state/cookies.
4. Fetch the application sign-in page and extract visible labels and linked auth endpoints. If the app is confirmed to use a provider-discovery endpoint, inspect its public response. Do not assume a guessed discovery endpoint's 404 proves auth is missing.
5. Save sanitized config and HTTP evidence to a task-specific temporary directory. Report verified stages separately from untested IdP consent, Workspace policy, token exchange, callback and application authorization.

## Pitfalls
- A redirect to Google proves Cognito accepted the authorization request, not that Google credentials or token exchange work.
- Reporter/assignee fields in related tickets do not establish decision ownership.
- The application may select a different pool/client from the one tested directly; HTML sign-in labels do not prove deployed client selection.
- Callback allowlists may retain obsolete hosts; root 404 does not prove callback failure. A wildcard-looking callback should not be assumed to match arbitrary subdomains.
- Regional access failures must be disclosed; do not claim exhaustive account coverage.

## Verification
1. Read the actual sanitized AWS JSON and HTTP evidence before reporting results.
2. State exact tested client and callback hosts, redirect result, application sign-in evidence and all unverified stages.
3. Confirm no AWS changes, credentials, tokens, secrets or user PII were emitted.