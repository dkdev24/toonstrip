# M16 S0 scripts

Ran once, 2026-09-17, against `../figures.png`. Kept as the record of the gate test,
not as tooling. See `TOONSTRIP_DEV_PLAN.md` §16.1 S0 for the result.

Env: python 3.11 venv, `pip install "mediapipe==0.10.21" opencv-python`.
**Not** mediapipe 1.x — 1.0.1 aborts on macOS arm64 inside
`TensorsToDetectionsCalculator::Open` (`DrishtiMetalHelper ... Service is unavailable`),
with or without the CPU delegate. 0.10.21's legacy `mp.solutions.pose` works.

| script | does |
|---|---|
| `slice-figures.mjs` | cuts the 3x3 sheet into `../cells/*.png` (run from `packages/asset-packager`, for `@napi-rs/canvas`) |
| `estimate.py` | pose estimation per cell, neck vs a geometric collar proxy |
| `split.py` | alpha cut + neck-line split into `../cells-split/*--face.png` / `*--torso.png` |
| `seam.py` | recomposites the halves two ways, writes `../seam-check.png` |
