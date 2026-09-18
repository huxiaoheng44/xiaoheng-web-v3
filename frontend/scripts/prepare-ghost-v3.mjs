import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
const source = process.argv[2];
if (!source) throw new Error('Pass the round ghost sheet path.');
await copyFile(source, 'art-source/ghost-v3.png');
const cell = 64;
const { data, info } = await sharp(source).resize(cell*4, cell*4, { kernel:'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
// Chroma-key the deliberately opaque magenta background before frame isolation.
for(let i=0;i<data.length;i+=4){if(data[i]>130 && data[i+2]>130 && data[i+1]<Math.min(data[i],data[i+2])*.65)data[i+3]=0;}
const frames = [];
for (let row=0; row<4; row++) for (let col=0; col<4; col++) {
  const seen = new Set(); let largest = [];
  for (let seed=0; seed<cell*cell; seed++) {
    if (seen.has(seed)) continue;
    const queue=[seed], pixels=[];
    while (queue.length) {
      const p=queue.pop(); if (seen.has(p)) continue; seen.add(p);
      const x=p%cell, y=Math.floor(p/cell), i=((row*cell+y)*info.width+col*cell+x)*4;
      if (data[i+3]<200) continue;
      pixels.push(p);
      if(x>0)queue.push(p-1); if(x<cell-1)queue.push(p+1);
      if(y>0)queue.push(p-cell); if(y<cell-1)queue.push(p+cell);
    }
    if(pixels.length>largest.length)largest=pixels;
  }
  if(largest.length<100)throw new Error(`Missing frame ${row},${col}`);
  const tile=Buffer.alloc(cell*cell*4);
  for(const p of largest){const x=p%cell,y=Math.floor(p/cell),i=((row*cell+y)*info.width+col*cell+x)*4;const shade=(data[i]+data[i+1]+data[i+2])/3>128?246:12;tile[p*4]=tile[p*4+1]=tile[p*4+2]=shade;tile[p*4+3]=255;}
  const trimmed=await sharp(tile,{raw:{width:cell,height:cell,channels:4}}).trim().png().toBuffer();
  const frame=await sharp(trimmed).resize(24,26,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},kernel:'nearest'}).png().toBuffer();
  frames.push({input:frame,left:col*32+4,top:row*32+3});
}
await sharp({create:{width:128,height:128,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames).png().toFile('public/assets/ghost-sprites-v3.png');
await sharp('public/assets/ghost-sprites-v3.png').extract({left:0,top:0,width:32,height:32}).resize(256,256,{kernel:'nearest'}).png().toFile('test-results/ghost-v3-preview.png');
console.log('Prepared round ghost: 24x26 silhouette, 32x32 cells, 16 frames.');
import './asset-workspace.mjs';
