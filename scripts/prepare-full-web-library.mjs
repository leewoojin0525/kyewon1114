import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
const root='.data/full-library-20261118';
const inventory=JSON.parse(await fs.readFile('assets/website-photo-prep-20261118/inventory.json','utf8'));
const quality=JSON.parse(await fs.readFile(root+'/quality-review.json','utf8')).upgrades;
const live=JSON.parse(await fs.readFile(root+'/live-before.json','utf8'));
const previous=JSON.parse(await fs.readFile('.data/photo-replacement-20261118/replacement-plan.json','utf8'));
const matches=JSON.parse(await fs.readFile('.data/photo-replacement-20261118/matching-review.json','utf8')).results;
const resume=await fs.readFile(root+'/plan.json','utf8').then(JSON.parse).catch(()=>null);
const out=path.resolve('assets/website-full-library-20261118');
const hash=b=>createHash('sha256').update(b).digest('hex');
const groupBySlug={'kyobo-hottracks-2015':['KyoboD','KyoboS'],'samjeon-165-18':['Samjeon'],'tied-2013':['Tied'],'zipzoong-2016':['ZIPZOONG'],'almost-home-2013':['AlmostHome'],'soyo-2009':['Soyo'],'consilience-2010':['Consilience'],'co-excistence-2010':['Coexistence'],'refresh-your-life-heim-2014':['HEIM'],'my-favorite-gwangju-2013':['Gwangju'],'indian-victory-showroom-2013':['VictoryIndian'],'tolerance-harmonization-2008':['Tolerance'],'visible-invisible-2012':['Visible'],'zagliani-2012':['Zagliani'],'moovboot-flagship-store-2011':['Moovboot'],'valentine-2009':['Valentine'],'change-it-yourself-2010':['Change'],'p-house-2014':['P-house'],'hab-house-7':['HAB7'],'yeonhui-seed':['Seed'],'gwangjang-apartment':['S-house'],'gong-cha-korea-2015':['Gongcha'],'hab-house-1':['HAB1'],'marina-club-house-2012':['Marina'],'elbon':['Elbon']};
const additions=[{slug:'hab-house-1',title:'HAB House 1'},{slug:'marina-club-house-2012',title:'Marina Club House'},{slug:'elbon',title:'Elbon'}];
sharp.concurrency(2);sharp.cache({memory:96});
const photos=[];
const reusedIds=new Set();
for(const f of inventory.files){
 const upgrade=quality.find(q=>q.sourceId===f.id);
 const source=upgrade?.chosen.path||path.resolve('assets/website-photo-prep-20261118/web',f.folderName,f.outputName);
 const output=path.join(out,f.projectLabel,f.outputName);await fs.mkdir(path.dirname(output),{recursive:true});
 if(upgrade)await sharp(source).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').webp({quality:84,effort:5}).toFile(output);
 else await fs.copyFile(source,output);
 const bytes=await fs.readFile(output),sha256=hash(bytes),m=await sharp(bytes).metadata();
 const same=previous.photos.find(p=>p.sha256===sha256&&!reusedIds.has(p.newId));
 if(same)reusedIds.add(same.newId);
 const mediaId=same?.newId||resume?.photos.find(p=>p.sourceId===f.id)?.mediaId||randomUUID();
 photos.push({sourceId:f.id,label:f.projectLabel,reference:f.outputName.replace('.webp',''),filename:f.outputName,output,sourceOriginalUrl:f.url,upgradedFrom:upgrade?.chosen||null,mediaId,reuse:!!same,key:same?.key||`${mediaId}/${m.width}.webp`,width:m.width,height:m.height,bytes:bytes.length,sha256});
}
const selected=live.projects.filter(p=>p.published_version).sort((a,b)=>a.data.order-b.data.order);
const gong=selected.find(p=>p.data.slug==='gong-cha-korea-2015');
const ordered=[...selected.filter(p=>p!==gong)];
for(const a of additions){const existing=live.projects.find(p=>p.data.slug===a.slug);ordered.push(existing||{id:resume?.projects.find(p=>p.slug===a.slug)?.id||randomUUID(),current_version:0,published_version:null,data:{title:a.title,slug:a.slug,creditConfirmed:true,publishReviewed:true,demo:false,blocks:[]}});}
ordered.push(gong);
const projects=[];
for(const [i,p] of ordered.entries()){
 const labels=groupBySlug[p.data.slug];if(!labels)throw new Error('Unmapped published project');
 const sourcePhotos=photos.filter(x=>labels.includes(x.label));
 const sequence=[],seen=new Set();
 function add(x,oldPhoto){if(seen.has(x.mediaId))return;seen.add(x.mediaId);sequence.push({asset:x,photo:{...(oldPhoto||{}),id:x.mediaId,alt:oldPhoto?.alt||(labels.some(x=>['Marina','Elbon'].includes(x))?`${p.data.title} — design visualization ${x.reference}`:`${p.data.title} — portfolio photograph ${x.reference}`),caption:'',focalX:oldPhoto?.focalX??50,focalY:oldPhoto?.focalY??50,mobileFocalX:oldPhoto?.mobileFocalX??50,mobileFocalY:oldPhoto?.mobileFocalY??50}});}
 const currentPhotos=[];if(p.published_version){if(p.data.hero)currentPhotos.push(p.data.hero);for(const b of p.data.blocks){if(b.type==='image')currentPhotos.push(b.image);if(b.type==='pair')currentPhotos.push(b.left,b.right);}}
 let extra=0;const label=labels.length>1?'Kyobo':labels[0];const initial=sourcePhotos.filter(x=>x.label===label).length;
 for(const current of currentPhotos){
  const prev=previous.photos.find(x=>x.newId===current.id);if(!prev)throw new Error('Current photo missing from reviewed source plan');
  const match=matches.find(x=>x.oldId===prev.oldId),c=match?.candidates[0];
  const reliable=c&&(c.exactDriveId||(c.mae<0.025&&c.hamming<=3&&c.aspect<0.025));
  const found=reliable?sourcePhotos.find(x=>x.sourceId===c.sourceId):null;
  if(found){add(found,current);continue;}
  extra++;
  const filename=`${label}-${String(initial+extra).padStart(3,'0')}.webp`,output=path.join(out,label,filename);
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(prev.output,output);
  const x={sourceId:null,label,reference:filename.replace('.webp',''),filename,output,retainedExisting:true,oldMediaId:current.id,mediaId:current.id,reuse:true,key:prev.key,width:prev.width,height:prev.height,bytes:prev.bytes,sha256:prev.sha256};
  photos.push(x);add(x,current);
 }
 for(const x of sourcePhotos)add(x);
 if(!sequence.length)throw new Error('Empty project');
 const blocks=[];
 for(let n=1;n<sequence.length;n++){
  const a=sequence[n],b=sequence[n+1];
  if(a.asset.height>a.asset.width&&b&&b.asset.height>b.asset.width){blocks.push({type:'pair',left:a.photo,right:b.photo,ratio:'equal'});n++;}
  else blocks.push({type:'image',image:a.photo,width:'wide'});
 }
 const data={...p.data,title:p.data.title,slug:p.data.slug,hero:sequence[0].photo,blocks,order:i+1,creditConfirmed:true,publishReviewed:true,demo:false};
 if(!p.published_version){Object.assign(data,{summary:'',region:'',category:'',workType:'',credits:'User-supplied portfolio images from the complete web-photo folder, authorized for publication on 2026-11-18. Design visualizations are retained as supplied; no completed construction claim is made.',seoTitle:p.data.title,seoDescription:`${p.data.title}. WOVN STUDIO portfolio.`});}
 for(const [n,x]of sequence.entries())Object.assign(x.asset,{projectId:p.id,projectNumber:i+1,title:data.title,slug:data.slug,order:n+1,placement:n===0?'cover':'gallery'});
 projects.push({id:p.id,title:data.title,slug:data.slug,expectedVersion:p.current_version,publishedVersion:p.published_version,beforeData:p.data,data,photos:sequence.map(x=>x.asset.mediaId),sourceCount:sourcePhotos.length,retainedCount:extra});
}
if(photos.filter(p=>p.sourceId).length!==727||new Set(photos.filter(p=>p.sourceId).map(p=>p.sourceId)).size!==727)throw new Error('Full source coverage failed');
const bundles=[];let pending=[],size=18;
await fs.mkdir(root+'/packs',{recursive:true,mode:0o700});
async function flush(){
 if(!pending.length)return;
 const header=Buffer.from('WOVN_WEB_MEDIA_V1\n');let offset=header.length;const buffers=[header];
 for(const p of pending){const b=await fs.readFile(p.output);if(hash(b)!==p.sha256)throw new Error('Photo changed during bundle preparation');buffers.push(b);p._offset=offset;offset+=b.length;}
 const data=Buffer.concat(buffers),sha256=hash(data),key=`packs/${sha256}.bin`,file=path.resolve(root,key);
 await fs.writeFile(file,data,{mode:0o600});
 for(const p of pending){p.packed={key,offset:p._offset,bytes:p.bytes,sha256:p.sha256};delete p._offset;}
 bundles.push({key,path:file,bytes:data.length,sha256,photos:pending.length});pending=[];size=18;
}
for(const p of photos.filter(p=>!p.reuse)){if(p.bytes>8*1024*1024)throw new Error('Web photo exceeds safe range limit');if(size+p.bytes>64_000_000)await flush();pending.push(p);size+=p.bytes;}
await flush();
const plan={createdAt:new Date().toISOString(),appURL:'https://kyewon1114.vercel.app',sourcePhotos:727,photos,projects,bundles,qualityUpgrades:quality.length};
await fs.writeFile(root+'/plan.json',JSON.stringify(plan,null,2),{mode:0o600});
console.log(JSON.stringify({projects:projects.map(p=>({title:p.title,photos:p.photos.length,newFolderPhotos:p.sourceCount,retained:p.retainedCount})),photos:photos.length,sourcePhotos:727,retainedExisting:photos.filter(p=>p.retainedExisting).length,qualityUpgrades:quality.length,reused:photos.filter(p=>p.reuse).length,newMedia:photos.filter(p=>!p.reuse).length,bundles:bundles.length,newStorageBytes:bundles.reduce((n,b)=>n+b.bytes,0)},null,2));
