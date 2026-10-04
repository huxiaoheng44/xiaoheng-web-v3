import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const root='frontend/art-source/crt-agent';
const actions=[
 ['idle',9,6,true],['listening',9,6,true],['scan',9,6,true],['travel',9,8,true],
 ['guide-left',9,8,false],['guide-right',9,8,false],['question',9,8,false],['answer',9,8,false],
 ['confused',9,8,false],['speaking',9,8,true],['error',9,8,false],['dozing',8,6,true],['awake',9,8,false],['sleep',10,6,false],
];
const files=[];
for(const [name,count,fps,loop] of actions){
 const paths=(await readdir(join(root,name))).filter(file=>file.endsWith('.png')).sort().slice(0,count).map(file=>join(root,name,file));
 if(paths.length!==count)throw new Error(`${name} frame count mismatch`);
 files.push({name,paths,fps,loop});
}
const cols=9, size=64, frames=[];const composites=[];
for(const action of files){
 const indices=[];const bounds=[];
 for(const path of action.paths){
  const image=sharp(path);const meta=await image.metadata();if(meta.width!==size||meta.height!==size||!meta.hasAlpha)throw new Error(`${path} must be transparent ${size}×${size}`);
  const raw=await image.ensureAlpha().raw().toBuffer();let left=size,top=size,right=-1,bottom=-1;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(raw[(y*size+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<0||left===0&&top===0&&right===size-1&&bottom===size-1)throw new Error(`${path} lacks transparent padding`);
  bounds.push({left,top,right,bottom});const index=frames.length,x=(index%cols)*size,y=Math.floor(index/cols)*size;
  frames.push({index,x,y,w:size,h:size,duration_ms:Math.round(1000/action.fps),offset:[0,0],source:relative(root,path).replaceAll('\\','/')});indices.push(index);composites.push({input:path,left:x,top:y});
 }
 const first=bounds[0],last=bounds.at(-1);if(action.loop&&(Math.abs(first.bottom-last.bottom)>4||Math.abs(first.left-last.left)>4))throw new Error(`${action.name} loop alignment exceeds four pixels`);
 action.indices=indices;
}
const rows=Math.ceil(frames.length/cols), sheet={width:cols*size,height:rows*size,columns:cols,padding:0};
const png=await sharp({create:{width:sheet.width,height:sheet.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toBuffer();
const metadata={schema_version:1,character:'crt-agent',canvas:{width:size,height:size},sheet,frames,animations:Object.fromEntries(files.map(action=>[action.name,{frames:action.indices,fps:action.fps,loop:action.loop}]))};
for(const target of [join(root,'dist'),join('frontend','public','assets')]){await mkdir(target,{recursive:true});await writeFile(join(target,'crt-agent.png'),png);await writeFile(join(target,'crt-agent.json'),`${JSON.stringify(metadata,null,2)}\n`);}
console.log(`Packed ${frames.length} transparent ${size}×${size} frames into ${sheet.width}×${sheet.height}; dozing loop and sleep-sequence metadata verified.`);
