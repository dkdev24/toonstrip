# Third-Party Notices

## Microsoft Comic Chat

- Original client: Microsoft Comic Chat (comic strip-style chat client, 1996-2003)
- License: MIT (verified against https://github.com/microsoft/comic-chat, 2026-10-31)
- Imported: 2026-09-01, via `packages/pack-comic-chat`
- Source of the converted art:
  - Character roster: already-decoded, already-packed sprite sheets and pose
    manifests ported from a sibling project's `web/assets/comic/roster/`
    (originally decoded from Comic Chat's `.avb` avatar files).
  - Backdrops: `field.bmp`, `pastoral.bmp`, `room8bs.bmp` — the original Comic
    Chat client's own bundled room backdrops (`v1.0-pre-modern` client
    resources), decoded fresh for this project via a minimal Windows DIB/RLE4
    decoder (`packages/pack-comic-chat/scripts/convert-backdrops.mjs`).
- See `NOTICE` (repo root) and `packages/pack-comic-chat/NOTICE` for the full
  attribution and trademark disclaimer.

Everything else in this repository — the rendering engine, schema, tooling,
and any other asset pack — is toonstrip's own original work, MIT-licensed
under this repo's own copyright.
