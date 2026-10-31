"""M16 S0 part 2: alpha-cut each cell, find the neck pinch between the mouth and
the shoulder line, and split into face-*/torso-* parts the packer could consume."""
import glob, os
import numpy as np, cv2, mediapipe as mp

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CELLS = os.path.join(ROOT, "cells")
OUT   = os.path.join(ROOT, "cells-split")
os.makedirs(OUT, exist_ok=True)
pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=2,
                              min_detection_confidence=0.2)

def alpha_cut(bgr):
    """Flood fill the flat background in from all four corners.

    FIXED_RANGE matters: the default compares each pixel to its neighbour, which at
    4K walks straight through the figure's antialiased outline and erases it (97.6%
    of one cell, measured). Comparing to the seed colour instead stops at the line.
    """
    h, w = bgr.shape[:2]
    mask = np.zeros((h+2, w+2), np.uint8)
    flood = bgr.copy()
    for seed in ((0,0), (w-1,0), (0,h-1), (w-1,h-1)):
        cv2.floodFill(flood, mask, seed, (0,0,0), (22,)*3, (22,)*3,
                      cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8) | 4)
    bg = mask[1:-1, 1:-1] > 0
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = np.where(bg, 0, 255)
    return rgba

rows = []
for path in sorted(glob.glob(f"{CELLS}/*.png")):
    name = os.path.basename(path)[:-4]
    bgr = cv2.imread(path)
    h, w = bgr.shape[:2]
    res = pose.process(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    p = res.pose_landmarks.landmark
    mouth_y = (p[9].y + p[10].y) / 2 * h
    sh_y    = (p[11].y + p[12].y) / 2 * h
    sh_x    = (p[11].x + p[12].x) / 2 * w

    rgba = alpha_cut(bgr)
    # Keep only the largest component: at 4K the stray specks a flood fill leaves
    # behind are wide enough to win the narrowest-row search below.
    n, lab, stats, _ = cv2.connectedComponentsWithStats((rgba[:, :, 3] > 8).astype(np.uint8), 8)
    if n > 1:
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        rgba[:, :, 3] = np.where(lab == keep, rgba[:, :, 3], 0)
    op = rgba[:, :, 3] > 8
    widths = op.sum(axis=1)
    floor = max(3, int(w * 0.015))          # noise floor, proportional to the cell
    band = [y for y in range(int(mouth_y), int(sh_y) + 1) if widths[y] > floor]
    cut = min(band, key=lambda y: widths[y]) if band else int((mouth_y + sh_y) / 2)

    face  = rgba[:cut+1].copy()
    torso = rgba[cut:].copy()
    cv2.imwrite(f"{OUT}/{name}--face.png", face)
    cv2.imwrite(f"{OUT}/{name}--torso.png", torso)
    xs = np.where(op[cut])[0]
    rows.append((name, cut, float(xs.mean()), widths[cut], mouth_y, sh_y, sh_x))

print(f"{'cell':<19}{'cutY':>5}{'cutX':>7}{'neckW':>7}{'mouthY':>8}{'shY':>7}")
for r in rows:
    print(f"{r[0]:<19}{r[1]:>5}{r[2]:>7.1f}{r[3]:>7}{r[4]:>8.1f}{r[5]:>7.1f}")
cy = [r[1] for r in rows]; cx = [r[2] for r in rows]; nw = [r[3] for r in rows]
print(f"\ncutY  spread {max(cy)-min(cy)}px = {100*(max(cy)-min(cy))/h:.1f}% of cell h")
print(f"cutX  spread {max(cx)-min(cx):.1f}px = {100*(max(cx)-min(cx))/w:.1f}% of cell w")
print(f"neckW min {min(nw)} max {max(nw)}")

