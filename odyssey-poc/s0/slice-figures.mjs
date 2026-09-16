// One-off S0 slicer: cuts odyssey-poc/figures.png into 9 per-cell PNGs for the
// pose-estimator test. Not part of the packager; the declared whole-figure sheet
// kind is deferred to M16 S3.
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
const ROOT = "/Users/daniel/Sites/toonstrip/odyssey-poc";
const img = await loadImage(`${ROOT}/figures.png`);
const W=img.width,H=img.height,cw=W/3,ch=H/3;
const src=createCanvas(W,H),sctx=src.getContext("2d");sctx.drawImage(img,0,0);
const names=[["NEUTRAL-neutral","HAPPY-wave","COY-pointother"],["BORED-shrug","SCARED-pointself","LAUGH-doublepoint"],["SAD-neutral","ANGRY-neutral","SHOUT-neutral"]];
const BAND=Math.round(ch*0.085), INSET=Math.round(cw*0.036); // label band, panel border
mkdirSync(`${ROOT}/cells`,{recursive:true});
for(let r=0;r<3;r++)for(let col=0;col<3;col++){
  const x=Math.round(col*cw)+INSET, y=Math.round(r*ch)+BAND;
  const w=Math.round(cw)-INSET*2, h=Math.round(ch)-BAND-INSET;
  const out=createCanvas(w,h); out.getContext("2d").drawImage(src,x,y,w,h,0,0,w,h);
  writeFileSync(`${ROOT}/cells/${names[r][col]}.png`, out.toBuffer("image/png"));
  console.log(`${names[r][col]}.png  ${w}x${h}`);
}
