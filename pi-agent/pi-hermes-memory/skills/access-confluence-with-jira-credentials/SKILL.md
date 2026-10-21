---
name: "access-confluence-with-jira-credentials"
description: "Read Confluence Cloud pages using existing Jira API-token credentials when jira CLI has no Confluence commands. Use for Confluence URLs, checking page access, fetching wiki content, or deciding how to handle Confluence alongside jira CLI."
version: 1
created: "2026-10-15"
updated: "2026-10-15"
---
## When to Use
User supplies a Confluence Cloud page URL or asks to read/search Confluence while Jira is accessed through jira CLI. Prefer an available authenticated Confluence integration; otherwise use REST API. Jira CLI itself may support Jira only.

## Procedure
1. Identify Confluence site and numeric page ID from URL. A common URL shape is `https://<site>.atlassian.net/wiki/spaces/<space>/pages/<page-id>/<title>`.
2. Check available Confluence integration or CLI before proposing installation. If none exists, use Confluence Cloud REST API v2 directly.
3. Reuse existing Jira account email/login and `JIRA_API_TOKEN` when available. Resolve account login from existing Jira CLI configuration without printing tokens or dumping configuration. Do not assume login is already exported. Never request token values in chat.
4. Use HTTPS Basic authentication with account email as username and API token as password. Prefer an in-process HTTP client that reads credentials from environment or an existing secure credential source; avoid putting expanded credentials in command arguments, logs, artifacts, or shell tracing. Restrict requests to intended Atlassian site; do not forward Authorization to another host.
5. For access verification, request `GET /wiki/api/v2/pages/{page-id}` without body format. Report HTTP status, returned title, page ID, and status only. HTTP 200 verifies metadata access, not that page body has been read.
6. When content is needed, request `GET /wiki/api/v2/pages/{page-id}?body-format=storage` and read `body.storage.value`. This is storage-format XHTML, not plain text; preserve headings, tables, links, and relevant macros when converting. Do not dump unrelated confidential content.
7. For page listing, use `GET /wiki/api/v2/pages` with documented filters and follow pagination links. Verify search endpoints and query syntax against current docs rather than inventing CLI commands or assuming v2 provides CQL search.
8. Distinguish authentication failure (401), permission failure (403), and absent or potentially hidden resource (404). Metadata access does not imply access to attachments, child pages, or entire space. Honor rate limits and Retry-After on 429. Scoped API tokens may require Atlassian API gateway URLs and suitable scopes; do not assume site-relative Basic authentication works for every token type.
9. Cite source page URL when answering from its content. For API/setup explanations, cite official documentation.

## Pitfalls
- Do not invent `jira confluence` commands or install another CLI when authenticated REST already solves request.
- Never expose credentials, Authorization headers, or full environment/configuration dumps.
- Do not hardcode private site URLs, account identifiers, page IDs, or credential values in reusable code.
- Verify current tool availability each session; previous absence of a Confluence CLI/MCP is not permanent.
- Read-only access requests do not authorize edits, comments, uploads, or permission changes.

## Verification
- Authenticated metadata request returns HTTP 200 and expected page title/ID.
- If body requested, confirm expected body representation is present before claiming guide was read.
- Confirm no credentials appear in output and no configuration or remote content changed.

## References
- [Confluence REST API v2: Pages](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/)
- [Confluence Basic authentication](https://developer.atlassian.com/cloud/confluence/basic-auth-for-rest-apis/)