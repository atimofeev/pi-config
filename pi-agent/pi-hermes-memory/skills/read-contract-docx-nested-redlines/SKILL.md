---
name: "read-contract-docx-nested-redlines"
description: "Read contract DOCX attachments with nested tracked changes when issue comments differ from latest wording; distinguish counterparty proposals from internal counter-redlines."
version: 1
created: "2026-10-12"
updated: "2026-10-12"
---
## When to Use
Reviewing contractual correspondence and successive Word drafts, especially when latest comment describes concessions absent from current document text.

## Procedure
1. Retrieve complete issue description, paginated comments and attachment inventory read-only. Download originals into task-specific temporary directory.
2. Extract all document paragraphs and tables with Python zipfile and ElementTree; inspect comments, footnotes, endnotes, headers, footers and embedded images.
3. Inspect w:ins and w:del author/date metadata. Evaluate nested changes recursively: current text excludes deleted subtrees; reject-all excludes inserted subtrees; author-selective reconstruction can recover intermediate counterparty proposal.
4. Compare baseline, counterparty proposal and internal counter-redlines. Cite which changes remain current and which were already reversed by internal reviewer.
5. Draft response covering outstanding business decisions without claiming negotiated edits are agreed, signed or implemented.

## Pitfalls
- Plain paragraph extraction can omit tracked insertions or concatenate mutually exclusive revisions.
- Latest attachment may already contain internal counter-redlines; comment may describe earlier counterparty proposal.
- Revision author labels do not independently prove identity or party affiliation.
- Accepting all edits is text reconstruction, not evidence of contractual acceptance or execution.
- Inspect embedded images before claiming every attachment fully read; linked conversations and underlying agreements need separate access.

## Verification
1. Confirm comment count and attachment count against API totals.
2. Verify decisive revisions directly against original DOCX XML, not only agent summaries.
3. Check current deadline and payment clauses plus drafting defects introduced by edits.
4. State any external conversations or linked agreements not retrieved.