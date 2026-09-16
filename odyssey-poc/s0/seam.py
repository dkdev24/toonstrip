"""S0 pass condition 2: recomposite the split halves two ways and look at the seam.
  A = measured anchor (the neck x/y the estimator found)
  B = pack.ts's default rule (face joins at bbox bottom-centre, torso at bbox top-centre)
"""
import os
import numpy as np, cv2, mediapipe as mp

CELLS="/Users/daniel/Sites/toonstrip/odyssey-poc/cells"
SPLIT="/Users/daniel/Sites/toonstrip/odyssey-poc/cells-split"
PICK=["NEUTRAL-neutral","HAPPY-wave","LAUGH-doublepoint"]

def bbox(rgba):
    op=rgba[:,:,3]>8
    ys,xs=np.where(op)
    return xs.min(),ys.min(),xs.max(),ys.max()

def over(dst,src,ox,oy):
    h,w=src.shape[:2]
    x0,y0=max(0,ox),max(0,oy); x1,y1=min(dst.shape[1],ox+w),min(dst.shape[0],oy+h)
    if x1<=x0 or y1<=y0: return
    s=src[y0-oy:y1-oy, x0-ox:x1-ox].astype(float)
    d=dst[y0:y1, x0:x1].astype(float)
    a=(s[:,:,3:4]/255.0)
    d[:,:,:3]=s[:,:,:3]*a+d[:,:,:3]*(1-a)
    d[:,:,3:4]=np.maximum(d[:,:,3:4], s[:,:,3:4])
    dst[y0:y1, x0:x1]=d.astype(np.uint8)

pose=mp.solutions.pose.Pose(static_image_mode=True,model_complexity=2,min_detection_confidence=0.2)
tiles=[]
for name in PICK:
    orig=cv2.imread(f"{CELLS}/{name}.png")
    face=cv2.imread(f"{SPLIT}/{name}--face.png",cv2.IMREAD_UNCHANGED)
    torso=cv2.imread(f"{SPLIT}/{name}--torso.png",cv2.IMREAD_UNCHANGED)
    fb,tb=bbox(face),bbox(torso)
    face=face[fb[1]:fb[3]+1, fb[0]:fb[2]+1]          # trim, as the packer does
    torso=torso[tb[1]:tb[3]+1, tb[0]:tb[2]+1]
    # fit the pair into the preview tile, both parts by the same factor
    f=380/(face.shape[0]+torso.shape[0])
    if f<1:
        face=cv2.resize(face,None,fx=f,fy=f,interpolation=cv2.INTER_AREA)
        torso=cv2.resize(torso,None,fx=f,fy=f,interpolation=cv2.INTER_AREA)
    # measured anchor: the neck row's own centre in each trimmed part
    fop=face[:,:,3]>8; top_=torso[:,:,3]>8
    fx=np.where(fop[-1])[0].mean(); tx=np.where(top_[0])[0].mean()
    H,W=520,420
    for label,(ax,ay),(bx,by) in [
        ("A measured anchor",(fx,face.shape[0]-1),(tx,0)),
        ("B bbox rule",(face.shape[1]/2,face.shape[0]-1),(torso.shape[1]/2,0))]:
        c=np.zeros((H,W,4),np.uint8); c[:,:,:3]=40
        px,py=W//2,90
        over(c,torso,int(px-bx),int(py-by))
        over(c,face,int(px-ax),int(py-ay))
        cv2.putText(c,f"{name}  {label}",(8,18),cv2.FONT_HERSHEY_SIMPLEX,0.42,(255,255,255,255),1)
        cv2.line(c,(0,py),(W,py),(0,255,255,255),1)
        tiles.append(c)
sheet=np.hstack([np.vstack(tiles[i::2]) for i in (0,1)])
cv2.imwrite("/Users/daniel/Sites/toonstrip/odyssey-poc/seam-check.png",sheet)
print("wrote odyssey-poc/seam-check.png", sheet.shape)
