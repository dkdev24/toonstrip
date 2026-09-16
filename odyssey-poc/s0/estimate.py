"""M16 S0: does a lightweight pose estimator find the neck join on generated
cartoon figures? Reference is the geometric collar line measured off the same
cells (narrowest row between head and shoulders)."""
import glob, os, sys
import numpy as np, cv2
import mediapipe as mp

CELLS = "/Users/daniel/Sites/toonstrip/odyssey-poc/cells"
UPSCALE = int(sys.argv[1]) if len(sys.argv) > 1 else 1

pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=2,
                              min_detection_confidence=0.2, enable_segmentation=False)

def geometric_collar(bgr):
    """Figure bbox + narrowest row in the 6-24% band below the top."""
    bg = bgr[int(bgr.shape[0]*0.9), 8].astype(int)
    fg = (np.abs(bgr.astype(int) - bg).max(axis=2) > 16)
    cols, rows = fg.any(axis=0), fg.any(axis=1)
    if not rows.any(): return None
    y0, y1 = np.argmax(rows), len(rows)-1-np.argmax(rows[::-1])
    x0, x1 = np.argmax(cols), len(cols)-1-np.argmax(cols[::-1])
    h = y1 - y0
    widths = fg.sum(axis=1)
    band = range(y0+int(h*0.06), y0+int(h*0.24))
    ny = min(band, key=lambda y: widths[y] if widths[y] > 2 else 10**6)
    xs = np.where(fg[ny])[0]
    return dict(y0=y0, y1=y1, x0=x0, x1=x1, h=h, neck=(float(xs.mean()), float(ny)))

print(f"upscale x{UPSCALE}\n")
hdr = f"{'cell':<19}{'det':>4}{'vis':>6}  {'mp neck (x,y)':>16}{'geo neck (x,y)':>17}   dx%   dy%"
print(hdr); print("-"*len(hdr))
errs = []
for path in sorted(glob.glob(f"{CELLS}/*.png")):
    bgr = cv2.imread(path)
    geo = geometric_collar(bgr)
    if UPSCALE > 1:
        bgr_in = cv2.resize(bgr, None, fx=UPSCALE, fy=UPSCALE, interpolation=cv2.INTER_CUBIC)
    else:
        bgr_in = bgr
    H, W = bgr_in.shape[:2]
    res = pose.process(cv2.cvtColor(bgr_in, cv2.COLOR_BGR2RGB))
    name = os.path.basename(path)[:-4]
    if not res.pose_landmarks:
        print(f"{name:<19}{'NO':>4}"); errs.append(None); continue
    p = res.pose_landmarks.landmark
    ls, rs = p[11], p[12]           # left/right shoulder
    nx = (ls.x + rs.x) / 2 * W / UPSCALE
    ny = (ls.y + rs.y) / 2 * H / UPSCALE
    vis = (ls.visibility + rs.visibility) / 2
    gx, gy = geo["neck"]
    dx = 100 * (nx - gx) / bgr.shape[1]
    dy = 100 * (ny - gy) / bgr.shape[0]
    errs.append((dx, dy))
    print(f"{name:<19}{'yes':>4}{vis:>6.2f}  {nx:>7.1f},{ny:>7.1f}{gx:>9.1f},{gy:>7.1f}{dx:>6.1f}{dy:>6.1f}")

ok = [e for e in errs if e]
print(f"\ndetected {len(ok)}/{len(errs)}")
if ok:
    print(f"|dx| max {max(abs(e[0]) for e in ok):.1f}%   |dy| max {max(abs(e[1]) for e in ok):.1f}%   (window ±14%)")
