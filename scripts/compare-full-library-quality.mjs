import fs from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
const root='assets/website-photo-prep-20261118';
const inventory=JSON.parse(await fs.readFile(root+'/inventory.json','utf8'));
const legacy=JSON.parse(await fs.readFile('assets/reference-lwj/work-image-inventory.json','utf8'));
const old=JSON.parse(await fs.readFile('.data/photo-replacement-20261118/matching-review.json','utf8')).results;
const groups={HAB1:['75'],HAB7:['75'],'P-house':['63','46'],Marina:['33'],AlmostHome:['34'],Soyo:['52'],KyoboS:['71','68'],KyoboD:['67'],HEIM:['66'],Gongcha:['70','72'],VictoryIndian:['42'],Zagliani:['49'],Elbon:['11','9'],Moovboot:['50'],Valentine:['59'],Tied:['38','37'],Visible:['47'],Tolerance:['26'],Consilience:['55'],Coexistence:['48'],Gwangju:['36'],ZIPZOONG:['73']};
sharp.concurrency(2);sharp.cache({memory:96});
const cache=new Map();
async function fp(file){
 if(cache.has(file))return cache.get(file);
 const m=await sharp(file).metadata();const w=m.orientation>=5?m.height:m.width,h=m.orientation>=5?m.width:m.height;
 const rgb=await sharp(file).rotate().resize(24,24,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
 const grey=await sharp(file).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(grey[y*9+x]>grey[y*9+x+1]);
 const f={rgb,bits,w,h,ratio:w/h};cache.set(file,f);return f;
}
function diff(a,b){let mae=0,hamming=0;for(let i=0;i<a.rgb.length;i++)mae+=Math.abs(a.rgb[i]-b.rgb[i]);for(let i=0;i<64;i++)if(a.bits[i]!==b.bits[i])hamming++;return {mae:mae/a.rgb.length/255,hamming,aspect:Math.abs(Math.log(a.ratio/b.ratio))};}
const results=[];
for(const f of inventory.files){
 const source=path.resolve(root,'web',f.folderName,f.outputName),a=await fp(source);
 const candidates=legacy.filter(x=>(groups[f.projectLabel]||[]).includes(x.projectId)).map(x=>({path:x.path,kind:'lwj.co.kr',url:x.url,name:x.title}));
 for(const x of old){const c=x.candidates[0];if(c?.sourceId===f.id)candidates.push({path:x.originalPath,kind:'existing-website-original',name:x.title});}
 const eligible=[];
 for(const c of candidates){
  let b;try{b=await fp(c.path);}catch{continue;}
  if(Math.min(2400,Math.max(b.w,b.h))<Math.max(a.w,a.h)*1.15)continue;
  const d=diff(a,b);
  if(d.mae<0.025&&d.hamming<=3&&d.aspect<0.025)eligible.push({...c,...d,width:b.w,height:b.h});
 }
 eligible.sort((a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height)||a.mae-b.mae);
 if(eligible.length)results.push({sourceId:f.id,label:f.projectLabel,filename:f.outputName,currentPath:source,currentWidth:a.w,currentHeight:a.h,chosen:eligible[0]});
}
await fs.mkdir('.data/full-library-20261118',{recursive:true,mode:0o700});
await fs.writeFile('.data/full-library-20261118/quality-review.json',JSON.stringify({compared:inventory.files.length,legacyImages:legacy.length,upgrades:results},null,2),{mode:0o600});
console.log(JSON.stringify({compared:inventory.files.length,upgrades:results.length,examples:results.slice(0,12).map(x=>({name:x.filename,before:[x.currentWidth,x.currentHeight],after:[x.chosen.width,x.chosen.height],source:x.chosen.kind}))}));
