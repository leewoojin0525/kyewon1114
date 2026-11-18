import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = 'assets/website-photo-prep-20261118';
const current = JSON.parse(await fs.readFile('.data/photo-replacement-20261118/live-before.json','utf8'));
const inventory = JSON.parse(await fs.readFile(root+'/inventory.json','utf8'));
const receipts = await Promise.all((await fs.readdir(root+'/receipts')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await fs.readFile(root+'/receipts/'+f,'utf8'))));
const receiptsById = new Map(receipts.map(r=>[r.id,r]));
const driveMap = JSON.parse(await fs.readFile('.data/drive-project-import.json','utf8'));
const originalDriveId = new Map(Object.entries(driveMap.assets).map(([id,v])=>[v.mediaId,id]));
const labels = {
 'kyobo-hottracks-2015':['KyoboD','KyoboS'], 'samjeon-165-18':['Samjeon'], 'tied-2013':['Tied'], 'zipzoong-2016':['ZIPZOONG'], 'almost-home-2013':['AlmostHome'], 'soyo-2009':['Soyo'], 'consilience-2010':['Consilience'], 'co-excistence-2010':['Coexistence'], 'refresh-your-life-heim-2014':['HEIM'], 'my-favorite-gwangju-2013':['Gwangju'], 'indian-victory-showroom-2013':['VictoryIndian'], 'tolerance-harmonization-2008':['Tolerance'], 'visible-invisible-2012':['Visible'], 'zagliani-2012':['Zagliani'], 'moovboot-flagship-store-2011':['Moovboot'], 'valentine-2009':['Valentine'], 'p-house-2014':['P-house'], 'hab-house-7':['HAB7'], 'gwangjang-apartment':['S-house'], 'gong-cha-korea-2015':['Gongcha']
};
sharp.concurrency(2); sharp.cache({memory:64});
async function fingerprint(file){
 const m=await sharp(file).metadata();
 const rgb=await sharp(file).rotate().resize(24,24,{fit:'fill'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
 const grey=await sharp(file).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();
 const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(grey[y*9+x]>grey[y*9+x+1]);
 return {rgb,bits,ratio:(m.orientation>=5?m.height:m.width)/(m.orientation>=5?m.width:m.height)};
}
const cache=new Map();
async function fp(file){if(!cache.has(file))cache.set(file,await fingerprint(file));return cache.get(file);}
function difference(a,b){let mae=0,hamming=0;for(let i=0;i<a.rgb.length;i++)mae+=Math.abs(a.rgb[i]-b.rgb[i]);for(let i=0;i<64;i++)if(a.bits[i]!==b.bits[i])hamming++;mae/=a.rgb.length*255;const aspect=Math.abs(Math.log(a.ratio/b.ratio));return {mae,hamming,aspect,score:mae+hamming/640+Math.min(aspect,1)/10};}
const results=[];
for(const project of current.projects){
 const candidates=inventory.files.filter(f=>(labels[project.public_slug]||[]).includes(f.projectLabel)&&receiptsById.has(f.id));
 for(const photo of project.photos){
  const media=current.media.find(m=>m.id===photo.id),originalPath=path.resolve('.data/deployment-snapshot/media',media.original_key),a=await fp(originalPath);
  const ranks=[];for(const c of candidates){const receipt=receiptsById.get(c.id);ranks.push({sourceId:c.id,name:c.outputName,path:receipt.outputPath,...difference(a,await fp(receipt.outputPath)),exactDriveId:originalDriveId.get(photo.id)===c.id});}
  ranks.sort((a,b)=>Number(b.exactDriveId)-Number(a.exactDriveId)||a.score-b.score);
  const first=ranks[0],strong=Boolean(first&&(first.exactDriveId||(first.mae<0.055&&first.hamming<=10&&first.aspect<0.13)));
  results.push({projectId:project.id,title:project.data.title,slug:project.public_slug,oldId:photo.id,order:photo.order,placement:photo.placement,originalPath,oldOriginalBytes:Number(media.bytes),candidates:ranks.slice(0,3),strong});
 }
 console.log(JSON.stringify({project:project.data.title,photos:project.photos.length,strong:results.filter(r=>r.projectId===project.id&&r.strong).length,candidates:candidates.length}));
}
await fs.writeFile('.data/photo-replacement-20261118/matching-review.json',JSON.stringify({createdAt:new Date().toISOString(),readySourceCount:receipts.length,results},null,2),{mode:0o600});
console.log(JSON.stringify({photos:results.length,strong:results.filter(r=>r.strong).length,review:results.filter(r=>!r.strong).length}));
