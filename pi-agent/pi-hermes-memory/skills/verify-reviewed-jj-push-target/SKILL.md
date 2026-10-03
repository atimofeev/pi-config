---
name: "verify-reviewed-jj-push-target"
description: "Verify JJ push automation publishes reviewed commits without snapshotting later filesystem edits"
version: 1
created: "2026-10-02"
updated: "2026-10-02"
---
## When to Use
Use when building or testing interactive JJ bookmark-and-push automation, especially when described @ itself is the publish target.

## Procedure
1. Resolve reviewed target to full commit ID. Treat empty undescribed @ as a working-copy placeholder and require exactly one parent; preserve described empty commits.
2. Infer candidate bookmarks from heads(::TARGET & bookmarks()), not arbitrary log order. Require explicit selection when bookmarks or tracked remotes are ambiguous.
3. After confirmation, revalidate target and bookmark. Use --ignore-working-copy on bookmark move and push commands so later filesystem edits cannot rewrite reviewed @.
4. Move exact:NAME to pinned commit, run explicit-remote/bookmark push --dry-run, then recheck bookmark target before actual push. Preserve native remote-state protection; never add validation bypasses.
5. Test using native JJ commands in temporary repos with local bare Git remotes outside JJ repos. Cover @- and described @ paths, then inject filesystem edits immediately before bookmark move and assert remote content still matches reviewed commit.

## Pitfalls
- JJ has no current branch; nearest-bookmark inference is a conservative convention, not proof of user intent.
- Mocks can pass with invalid JJ templates or pattern syntax. Verify native commands against installed JJ version.
- JJ 0.41 removed --allow-new; explicitly selected bookmarks auto-track on push. Check installed help instead of copying older flags.
- Dry-run or push failure can leave bookmark moved locally. Report that state; avoid automatic rollback that may overwrite concurrent changes.
- Do not push real upstream during tests or run Git commands inside JJ fixtures.

## Verification
1. Native integration tests show intended local bare-remote ref points to reviewed full commit ID.
2. Edits injected after review remain on disk and never appear in pushed content.
3. Ambiguity, cancellation, stale bookmark and dry-run failure tests prevent unintended pushes.