import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
const root='.data/photo-replacement-20261118';
const live=JSON.parse(await fs.readFile(root+'/live-before.json','utf8'));
const matches=JSON.parse(await fs.readFile(root+'/matching-review.json','utf8')).results;
const dest=path.resolve('assets/current-website-web-20261118');
const names=['Kyobo','Samjeon','Tied','ZIPZOONG','AlmostHome','Soyo','Consilience','Coexistence','HEIM','Gwangju','VictoryIndian','Tolerance','Visible','Zagliani','Moovboot','Valentine','Change','P-house','HAB7','Seed','S-house','Gongcha'];
const old=await fs.readFile(root+'/replacement-plan.json','utf8').then(JSON.parse).catch(()=>null);
sharp.concurrency(2);
const photos=[];
for(const [i,project] of live.projects.entries()) {
 for(const photo of project.photos) {
  const m=live.media.find(m=>m.id===photo.id);
  const match=matches.find(r=>r.oldId===photo.id);
  const c=match.candidates[0];
  const original=path.resolve('.data/deployment-snapshot/media',m.original_key);
  const originalMeta=await sharp(original).metadata();
  let source=original,sourceId=null,sourceName='Existing verified website original';
  // Do not replace a photograph with a merely similar view or a lower-resolution scan.
  if(c&&(c.exactDriveId||(c.mae<0.025&&c.hamming<=3&&c.aspect<0.025))) {
   const cm=await sharp(c.path).metadata();
   if(Math.max(cm.width,cm.height)>=Math.min(2400,Math.max(originalMeta.width,originalMeta.height))) {
    source=c.path;sourceId=c.sourceId;sourceName=c.name;
   }
  }
  const number=`P${String(i+1).padStart(2,'0')}-${String(photo.order).padStart(3,'0')}`;
  const filename=`${names[i]}-${String(photo.order).padStart(3,'0')}.webp`;
  const output=path.join(dest,names[i],filename);
  await fs.mkdir(path.dirname(output),{recursive:true});
  if(sourceId) await fs.copyFile(source,output);
  else await sharp(source).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').webp({quality:84,effort:5}).toFile(output);
  const data=await fs.readFile(output), meta=await sharp(data).metadata();
  await sharp(data).raw().toBuffer();
  const newId=old?.photos.find(p=>p.oldId===photo.id)?.newId||randomUUID();
  photos.push({number,projectNumber:i+1,projectId:project.id,title:project.data.title,slug:project.public_slug,order:photo.order,placement:photo.placement,oldId:photo.id,newId,filename,output,sourceId,sourceName,originalKey:m.original_key,oldBytes:Number(m.bytes),width:meta.width,height:meta.height,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),key:`${newId}/${meta.width}.webp`});
 }
 console.log(`${project.data.title}: ${project.photos.length}`);
}
const plan={createdAt:new Date().toISOString(),appURL:'https://kyewon1114.vercel.app',preserveOrder:true,preserveCovers:true,projects:live.projects.map(p=>({id:p.id,slug:p.public_slug,title:p.data.title,expectedVersion:p.current_version,publishedVersion:p.published_version,data:p.data})),photos};
await fs.writeFile(root+'/replacement-plan.json',JSON.stringify(plan,null,2),{mode:0o600});
console.log(JSON.stringify({photos:photos.length,fromPreparedDrive:photos.filter(p=>p.sourceId).length,fromVerifiedExisting:photos.filter(p=>!p.sourceId).length,beforeOriginalBytes:photos.reduce((n,p)=>n+p.oldBytes,0),webBytes:photos.reduce((n,p)=>n+p.bytes,0)}));
