"""The decisive S0 test: the pack format composites any face onto any torso, so put
one character's face on another pose's torso and see what the scanline cut carried over."""
import os
import numpy as np, cv2
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SPLIT=os.path.join(ROOT, "cells-split")
PAIRS=[("NEUTRAL-neutral","BORED-shrug"),("SHOUT-neutral","HAPPY-wave"),
       ("ANGRY-neutral","LAUGH-doublepoint"),("SAD-neutral","SAD-neutral")]
def trim(a):
    ys,xs=np.where(a[:,:,3]>8); return a[ys.min():ys.max()+1, xs.min():xs.max()+1]
def over(dst,src,ox,oy):
    h,w=src.shape[:2]
    x0,y0=max(0,ox),max(0,oy); x1,y1=min(dst.shape[1],ox+w),min(dst.shape[0],oy+h)
    s=src[y0-oy:y1-oy, x0-ox:x1-ox].astype(float); d=dst[y0:y1,x0:x1].astype(float)
    a=s[:,:,3:4]/255.0
    d[:,:,:3]=s[:,:,:3]*a+d[:,:,:3]*(1-a); d[:,:,3:4]=np.maximum(d[:,:,3:4],s[:,:,3:4])
    dst[y0:y1,x0:x1]=d.astype(np.uint8)
tiles=[]
for fname,tname in PAIRS:
    face=trim(cv2.imread(f"{SPLIT}/{fname}--face.png",cv2.IMREAD_UNCHANGED))
    torso=trim(cv2.imread(f"{SPLIT}/{tname}--torso.png",cv2.IMREAD_UNCHANGED))
    f=380/(face.shape[0]+torso.shape[0])
    face=cv2.resize(face,None,fx=f,fy=f,interpolation=cv2.INTER_AREA)
    torso=cv2.resize(torso,None,fx=f,fy=f,interpolation=cv2.INTER_AREA)
    fx=np.where(face[:,:,3][-1]>8)[0].mean(); tx=np.where(torso[:,:,3][0]>8)[0].mean()
    H,W=470,430; c=np.zeros((H,W,4),np.uint8); c[:,:,:3]=40
    px,py=W//2,110
    over(c,torso,int(px-tx),py); over(c,face,int(px-fx),py-face.shape[0]+1)
    cv2.putText(c,f"face {fname}",(8,18),cv2.FONT_HERSHEY_SIMPLEX,0.40,(255,255,255,255),1)
    cv2.putText(c,f"torso {tname}",(8,34),cv2.FONT_HERSHEY_SIMPLEX,0.40,(120,220,255,255),1)
    tiles.append(c)
cv2.imwrite(os.path.join(ROOT, "crossmix.png"),np.hstack(tiles))
print("wrote odyssey-poc/crossmix.png")
