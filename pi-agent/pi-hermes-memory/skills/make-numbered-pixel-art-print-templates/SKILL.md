---
name: "make-numbered-pixel-art-print-templates"
description: "Convert small pixel textures into exact-size, ink-saving paint-by-number PDFs tiled over A4 sheets"
version: 3
created: "2026-09-30"
updated: "2026-09-30"
---
## When to Use
User wants full-size physical decorations from pixel-art textures, numbered unfilled cells, shared colour key, and multi-sheet printing.

## Procedure
1. Confirm physical units, face dimensions, included faces, and target paper before generating artifacts.
2. Obtain authentic or user-supplied texture assets and record provenance. For Minecraft grass, tint grayscale top and alpha side overlay by chosen biome RGB, then composite tinted overlay over untinted side base.
3. Build a shared numbered palette from original textures, separating semantic colour groups when useful. Preserve original pixel aspect ratio by default: choose one square physical pitch across faces; extend texture with explicitly planned rows/columns and crop only outer edge cells to exact physical dimensions.
4. For added rows, retain original texture rows unchanged and design distinct new horizontal patterns using existing palette codes. Distribute extra height between material bands rather than enlarging one band excessively. Inspect coloured preview before finalising PDFs.
5. Compute page artwork windows and strides in millimetres: stride = window - overlap; coverage = window + (tile_count - 1) * stride. Reserve printable header band; verify all face extents covered.
6. Use Pillow for texture and palette mapping, ReportLab for exact-pitch vector white cells, thin light-grey borders, centred numbers, tile clipping, and face/page/row/column labels. Clamp outer cells and centre their numbers within remaining visible area.
7. Generate combined and per-face paint PDFs plus separate colour key, scaled net/reference, assembly instructions, 100mm calibration ruler, manifest, reproducible source, and ZIP. Refuse unrelated overwrites; revisions go to new directories.
8. Use ephemeral uv or Nix dependencies; keep temporary scripts and rendered checks under task-specific /tmp/pi-coding-agent directory.

## Pitfalls
- A grayscale Minecraft grass-top texture needs biome tint; tinting entire side base incorrectly makes dirt green.
- Stretching pixel dimensions changes visual texture. Default to preserving aspect ratio, but user-approved slight single-axis stretching can remove narrow outer strips; record exact column widths and explicit row heights.
- Repeating identical rows produces glitch-like stripes. Added rows should be unique, not copies, cyclic shifts, or reversals of existing rows; avoid excessive grass expansion.
- Unique new rows can still place stone/contrast pixels directly below matching pixels in adjacent old rows. Check feature-column alignment across insertion seams and deliberately offset new isolated features.
- When moving a partial dirt row to grass, clarify whether user wants transfer of that row or a different crop. Represent row order and individual heights explicitly; use cumulative offsets in PDF, reference and preview, not row_index times uniform pitch.
- Palette must stay identical between all numbered templates and colour references.
- Do not put assembly labels over paint cells. Reserve header space before calculating tile counts; large generic margins can add entire rows of sheets.
- Overlaps duplicate existing artwork; they must not increase assembled face dimensions.
- Preserve aspect ratio in previews unless stretching explicitly approved. With variable row heights, render row strips individually; direct resize of whole expanded grid produces wrong geometry.
- Check preview canvas against every face extent. When copying reproducible source from an earlier pack, whitelist asset files so old generator cannot overwrite new generator.
- Printer fit-to-page changes physical scale; require 100% Actual size and ruler verification.
## Verification
1. Inspect actual PDF page boxes and counts; verify expected face sizes, square pitch, partial edge dimensions, tile origins, overlaps, and full coverage.
2. Check original matrices remain unchanged, expanded matrices match row/column insertion plan, added patterns are unique, and palette codes/counts stay consistent.
3. Inspect actual PDF vectors for exact cell dimensions, white-only fills, light-grey thin borders, matching centred numbers, and a 100mm ruler.
4. Render representative top/side/last tiles and every reference page; visually inspect material proportions, repeated-row artifacts, labels, clipping, and palette consistency. Compare preview pixels against expanded matrices.
5. Check ZIP integrity; archived PDFs must match final deliverables and include new reproducible source. Preserve previous packs unchanged.