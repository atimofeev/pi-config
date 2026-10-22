---
name: "jira-team-sprint-achievements"
description: "Create evidence-based Jira sprint summaries prioritizing strategic epics and significant accomplishments, with concise credited highlights, course-level learning recognition, complete task accounting and Slack formatting."
version: 5
created: "2026-10-07"
updated: "2026-10-21"
---
## When to Use
Use when asked to gather a team's completed Jira sprint tasks or create/refine a sprint report. Read notes/sprint-summary-report-template.md when available. The template and this skill hold reporting conventions; do not duplicate them as separate preference or caveat memories. Preserve user edits before refining an existing report.

## Procedure
1. Read Jira tool instructions and the local report template. Resolve exact sprint ID, dates, timezone, state, report cutoff and team account identities for verification. Keep Jira operations read-only and credentials out of outputs.
2. Confirm protected authenticated API access; jira me/serverinfo alone do not prove access. Distinguish authentication failures from genuinely empty results.
3. Query current Done-category sprint issues per team assignee. Verify pagination and unique keys. If offsets repeat identical pages, use targeted queries or supported continuation tokens.
4. Read individual issue evidence for exact status, resolution, sprint membership, completion dates, descriptions and closing comments. CLI list --raw may omit fields present in individual issue responses.
5. Exclude Cancelled/Won't Do despite Done category, and issues already completed before the sprint. Count eligible sprint-linked successful completions at the report cutoff together, including those completed after the scheduled date while the sprint remains active. Preserve actual dates in evidence and task registers.
6. Reconcile one combined completion total and contributor totals across the full eligible dataset. Highlight selection is separate from accounting: routine work omitted from shareable text remains in the complete register and counts. Document parent/subtask overlap when counting related learning issues.
7. Resolve the user's priority epics from the request or local template. Verify parent/epic ancestry or explicit issue links and lead with related completed work. Documented functional support may qualify, but do not present it as direct epic membership. Omit empty sections and keep absent/unverified relationships in internal evidence, not shareable text.
8. Outside priority work, highlight only significant accomplishments, such as completed resource migration to infrastructure code or substantial platform changes. Omit routine access management, supporting work, minor configuration requests and ordinary incident handling from shareable highlights. Do not force every counted issue into the summary.
9. Give unrelated selected accomplishments separate concise action items, contributor credits and Jira links. Roll related learning modules up to one course-level accomplishment with a congratulation; preserve the user's edited wording. Keep individual module evidence in the full register and never infer certification or an exam pass.
10. Write achievement items for non-technical readers using only the key action or outcome, contributor credit and Jira link. Remove bold from items; omit explanatory details, appended benefit clauses and rationale paragraphs. Use honest verbs such as audited, reviewed, investigated, documented, fixed and deployed; never turn an investigation into a claimed fix or expected benefits into measured results.
11. Introduce the team naturally. Omit sprint-end commentary, late-task labels, timing-split counts, team-versus-department disclaimers, evidence-gap commentary and audit-not-upgrade/review-not-deployed caveats from shareable text. Keep necessary limitations in internal notes; describe supported actions rather than inventing outcomes.
12. Apply Slack mrkdwn only to content inside Shareable summary. Preserve single-asterisk bold for the introduction, completion total and subsection labels; achievement items remain plain. Use bold subsection labels instead of Markdown headings. Preserve normal Markdown for note title, section headings, frontmatter, task register and evidence.
13. Read vault frontmatter conventions before creating or changing notes. Verify actual saved artifacts, full-population counts, selected-highlight credits, source links, epic mapping, preserved user edits and formatting boundaries. Store future convention changes in the skill and template instead of redundant memories.

## Pitfalls
- JQL status was Done AFTER a date can match issues already Done before that date; inspect actual completion timestamps.
- Missing raw-list fields are not confirmed nulls. displayName uses camelCase.
- Done category includes cancellations; successful completion requires checking exact status and resolution.
- Presentation preferences do not permit falsifying dates, dropping eligible issues from accounting because they were omitted as highlights, or counting pre-sprint completions.
- Shareable highlights need not equal register rows or the completion total. A course parent and learning subtasks may overlap in issue counts; disclose that internally without repeating every module in shareable text.
- A keyword in a host name, a generic backup incident or a disaster-recovery learning chapter does not establish strategic epic membership. Verify relationships and distinguish documented functional support from direct membership.
- Removing caveats from shareable text does not remove evidence safeguards. Never invent deployed fixes, completed upgrades, savings or performance metrics.
- Removing bold from achievement items does not mean removing it from the introduction, completion total or section labels. Never apply Slack formatting globally to the note.
- Do not merge unrelated selected issues merely to shorten the report. Use descriptions and closing comments together; omit credentials and unnecessary personal data.
- When refining an existing report, read current contents and preserve user edits, especially course-level learning recognition. Do not regenerate the old exhaustive summary.

## Verification
1. Every counted task confirms sprint membership, team identity and successful completion; combined and contributor totals match all eligible unique issues, not only selected highlights.
2. Cancellations and pre-sprint completions are excluded; actual completion dates remain correct. Any learning parent/subtask overlap is documented.
3. Verified priority-epic work leads the summary; other highlights are significant accomplishments. Routine access/support stays outside shareable text but remains accounted for. Empty priority sections are absent.
4. Related learning modules appear as one course-level accomplishment with contributor congratulation. User-edited wording is preserved and certification is not inferred.
5. Shareable summary has no scheduled-end commentary, late labels, scope disclaimers, evidence-gap caveats or Markdown headings.
6. Achievement items are concise, plain supported action text plus correct contributor credit and Jira link, without bold or appended explanations. Introduction, total and subsection labels retain single-asterisk Slack bold.
7. Unrelated selected achievements remain separate. All highlight keys are present in the full task register; no check requires every register row to appear in the shareable summary.
8. Normal Markdown outside Shareable summary remains intact. Template and skill agree, metadata follows local conventions, user edits survive, and reporting rules are not redundantly stored as individual memories.