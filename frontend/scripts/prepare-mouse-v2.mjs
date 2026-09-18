import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
const source=process.argv[2];
if(!source) throw new Error('Pass generated mouse source path');
await copyFile(source,'art-source/mouse-v2.png');
const cropped=await sharp(source).trim().png().toBuffer();
const {data,info}=await sharp(cropped).resize({width:48,kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const palette=[12,35,58,84,112,145,183,219,246];
let transparent=0;
for(let i=0;i<data.length;i+=4){const gray=(data[i]+data[i+1]+data[i+2])/3;const shade=palette.reduce((a,b)=>Math.abs(b-gray)<Math.abs(a-gray)?b:a);data[i]=data[i+1]=data[i+2]=shade;data[i+3]=data[i+3]<128?0:255;if(!data[i+3])transparent++;}
if(!transparent)throw new Error('Missing transparent background');
await sharp(data,{raw:info}).png().toFile('public/assets/mouse-v2.png');
console.log(`Mouse: ${info.width}x${info.height}, real alpha preserved`);
import './asset-workspace.mjs';
