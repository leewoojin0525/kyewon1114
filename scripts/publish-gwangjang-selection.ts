import { readFile, writeFile, rename } from 'node:fs/promises';
import { pool, type Actor } from '../src/lib/db';
import { uploadPhoto } from '../src/lib/media';
import { getDraft, saveDraft, workflow } from '../src/lib/content';
import { type Photo, type Block } from '../src/lib/model';
import { appEnv } from '../src/lib/env';
if (appEnv !== 'development') throw new Error('Local import only');
const mapPath = '.data/drive-project-import.json';
const mapping = JSON.parse(await readFile(mapPath,'utf8'));
const sources = JSON.parse(await readFile('assets/drive-projects/gwangjang-final/source-files.json','utf8'));
const record = mapping.projects['gwangjang-apartment'];
const folderId = '1wWDe4vaeJFqMxcOGO9-7v6woVf6D60iW';
const order = [2,5,4,3,9,10,14,8,6,7,12,18,17,22,21,19,23,11,13,15,16,20,1];
if (sources.length!==23 || new Set(order).size!==23) throw new Error('Selection mismatch');
const { rows:[account] } = await pool.query("SELECT id FROM cms.users WHERE role='owner' AND active=true ORDER BY id LIMIT 1");
const actor: Actor = {id:account.id,role:'owner'};
async function checkpoint(){await writeFile(`${mapPath}.tmp`,JSON.stringify(mapping,null,2),{mode:0o600});await rename(`${mapPath}.tmp`,mapPath);}
try {
  if (record.selectionFolderPublished===folderId) { console.log('Selection already published'); }
  else {
    const current = await getDraft(record.contentId);
    if(current.current_version!==current.published_version) throw new Error('Unpublished manual changes');
    const photos:Photo[]=[];
    for (const n of order) {
      const source=sources[n-1], key=source.id;
      if (!source.sha256 || !source.width) throw new Error('Unreviewed source');
      const file=`gwangjang-final/web/${key}.webp`;
      if(!mapping.assets[key]) {
        const m=await uploadPhoto(actor,{bytes:await readFile(`assets/drive-projects/${file}`),type:'image/webp'});
        mapping.assets[key]={mediaId:m.id,file,originalName:source.title,sha256:source.sha256,sourceFolder:folderId};
        await checkpoint();
      }
      photos.push({id:mapping.assets[key].mediaId,alt:n===2?'Gwangjang Apartment — open living space with warm oak and pale stone':`Gwangjang Apartment — selected photograph ${n}`,caption:'',focalX:50,focalY:50,mobileFocalX:50,mobileFocalY:50});
    }
    const blocks:Block[]=[];
    for(let i=1;i<photos.length;i++) {
      const a=sources[order[i]-1],b=sources[order[i+1]-1];
      if(a.height>a.width && b && b.height>b.width) blocks.push({type:'pair',ratio:'equal',left:photos[i],right:photos[++i]});
      else blocks.push({type:'image',width:'wide',image:photos[i]});
    }
    const data={...current.data,hero:photos[0],blocks,credits:'2026-11-14 사용자가 업로드 완료를 확인한 여의도사진 폴더의 최종 선택본 23장. 사용 권리 확인. 기존12장과 중간업로드는 이전판/비공개 원본으로 보존. Source folder: https://drive.google.com/drive/folders/'+folderId,creditConfirmed:true,publishReviewed:true};
    const saved=await saveDraft(actor,record.contentId,current.current_version,data);
    await workflow(actor,record.contentId,'publish',saved.version);
    Object.assign(record,{version:saved.version,published:true,photoCount:photos.length,selectionFolderPublished:folderId,heroSourceId:sources[1].id,note:'Final user selection replaces all previous public photographs; cover is selected photograph 2.'});
    await checkpoint();
    await writeFile('docs/drive-project-import-result.json',JSON.stringify({importedAt:new Date().toISOString(),environment:'local-development',projects:mapping.projects},null,2));
    await writeFile('docs/gwangjang-selection-result.json',JSON.stringify({publishedAt:new Date().toISOString(),contentId:record.contentId,version:saved.version,sourceFolder:folderId,photoCount:23,heroSourceId:sources[1].id,order:order.map(n=>({sourceId:sources[n-1].id,title:sources[n-1].title})),previousPhotosPreserved:true},null,2));
    console.log(`Gwangjang Apartment: ${photos.length} selected photographs published, v${saved.version}`);
  }
} finally {await pool.end();}
