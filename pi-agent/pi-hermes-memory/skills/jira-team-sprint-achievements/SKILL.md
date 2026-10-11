---
name: "jira-team-sprint-achievements"
description: "Create evidence-based Jira sprint reports with concise plain achievement items, contributor credits and issue links; preserve Slack bold only for summary intro, totals and section labels."
version: 4
created: "2026-10-07"
updated: "2026-10-07"
---
## When to Use
Use when asked to gather a team's completed Jira sprint tasks or create a sprint report. Read notes/sprint-summary-report-template.md when available. The template and this skill hold reporting conventions; do not duplicate them as separate preference or caveat memories.

## Procedure
1. Read Jira tool instructions and the local report template. Resolve exact sprint ID, dates, timezone, state, report cutoff and team account identities for verification. Keep Jira operations read-only and credentials out of outputs.
2. Confirm protected authenticated API access; jira me/serverinfo alone do not prove access. Distinguish authentication failures from genuinely empty results.
3. Query current Done-category sprint issues per team assignee. Verify pagination and unique keys. If offsets repeat identical pages, use targeted queries or supported continuation tokens.
4. Read individual issue evidence for exact status, resolution, sprint membership, completion dates, descriptions and closing comments. CLI list --raw may omit fields present in individual issue responses.
5. Exclude Cancelled/Won't Do despite Done category, and issues already completed before the sprint. Count eligible sprint-linked successful completions at the report cutoff together, including those completed after the scheduled date while the sprint remains active. Preserve actual dates in evidence and task registers.
6. Reconcile one combined total and contributor totals. Introduce the team naturally. Omit sprint-end commentary, late-task labels, timing-split counts and team-versus-department disclaimers. Only include category metrics or trends supported by complete evidence.
7. Group achievements by security, reliability, client experience and operational improvements. Each distinct issue gets its own concise action item, contributor credit and Jira link. Do not merge unrelated issues solely because they share a theme.
8. Write achievement items for non-technical readers using only the key action or outcome, followed by contributor credit and a Jira link. Remove bold from the items and omit explanatory details, appended benefit clauses and rationale paragraphs. Retain supporting details in the task register or evidence notes. Use honest verbs such as audited, reviewed, investigated, documented, fixed and deployed; never turn an investigation into a claimed fix or expected benefits into measured results.
9. Keep Shareable summary focused on completed actions. Omit evidence-gap and uncertainty commentary, audit-not-upgrade and review-not-deployed caveats. Put necessary evidence limitations outside shareable text. If outcomes are unverified, describe the supported action rather than inventing outcomes.
10. Apply Slack mrkdwn only to CONTENT inside Shareable summary. Preserve single-asterisk bold for the introduction, completion total and subsection labels; achievement items remain plain. Use bold subsection labels instead of Markdown headings. Preserve normal Markdown for the note title, the Shareable summary heading itself, frontmatter, evidence, task register and all surrounding sections.
11. Read vault frontmatter conventions before creating or changing notes. Verify actual saved artifacts, counts, credits, source links and formatting boundaries. Store future changes to this procedure in the skill and template instead of accumulating redundant memories.

## Pitfalls
- JQL status was Done AFTER a date can match issues already Done before that date; inspect actual completion timestamps.
- Missing raw-list fields are not confirmed nulls. displayName uses camelCase.
- Done category includes cancellations; successful completion requires checking exact status and resolution.
- Presentation preferences do not permit falsifying dates, dropping eligible tasks because of scheduled-end timing, or counting pre-sprint completions.
- Removing caveats from the shareable message does not remove evidence safeguards. Never invent deployed fixes, completed upgrades, savings or performance metrics.
- Removing bold from achievement items does not mean removing it from the introduction, completion total or section labels. Never apply Slack formatting globally to the whole note.
- Do not merge separate issues to shorten the report. Use descriptions and closing comments together; omit credentials and unnecessary personal data.

## Verification
1. Every included task confirms sprint membership, team identity and successful completion; combined and contributor totals match eligible unique issues.
2. Cancellations and pre-sprint completions are excluded; actual completion dates remain correct.
3. Shareable summary has no scheduled-end commentary, late-completion labels, scope disclaimers, evidence-gap caveats or Markdown headings.
4. Achievement items are concise, plain action text plus contributor credit and Jira link, without bold or appended explanations. Introduction, completion total and subsection labels retain single-asterisk Slack bold.
5. Unrelated issues remain separate, with correct individual contributors and Jira links. Action wording is readable and supported without invented outcomes.
6. Normal Markdown outside Shareable summary remains intact. Template and skill agree, metadata follows local conventions, and reporting rules are not redundantly stored as individual memory entries.