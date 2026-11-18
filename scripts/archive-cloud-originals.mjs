import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import pg from 'pg';
import {list,get,del} from '@vercel/blob';
const mode=process.argv[2]||'verify';
if(!['verify','apply'].includes(mode))throw new Error('Use verify or apply');
const config=parseEnv(await fs.readFile('.data/production-runtime.env','utf8'));
if(config.APP_URL!=='https://kyewon1114.vercel.app'||config.STORAGE_DRIVER!=='vercel-blob')throw new Error('Unexpected production target');
const token=config.BLOB_READ_WRITE_TOKEN;
const db=new pg.Client({connectionString:config.DATABASE_URL_UNPOOLED||config.DATABASE_URL});
const directory='.data/original-archives/20261118';
await fs.mkdir(directory,{recursive:true,mode:0o700});
const hash=b=>createHash('sha256').update(b).digest('hex');
async function remoteList(){let cursor;const blobs=[];do{const p=await list({token,cursor,limit:1000});blobs.push(...p.blobs);cursor=p.hasMore?p.cursor:undefined;}while(cursor);return blobs;}
await db.connect();
try {
 const {rows:owners}=await db.query("SELECT id FROM cms.users WHERE role='owner' AND active=true");
 if(owners.length!==1)throw new Error('Expected one active owner');
 if(mode==='verify') {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {rows:tables}=await db.query("SELECT table_schema AS schema,table_name AS name FROM information_schema.tables WHERE table_type='BASE TABLE' AND (table_schema='cms' OR (table_schema='public' AND table_name LIKE 'w\\_%')) ORDER BY table_schema,table_name");
  const snapshot=[];
  for(const t of tables){const {rows}=await db.query(`SELECT * FROM "${t.schema}"."${t.name}"`);snapshot.push({...t,rows});}
  await db.query('COMMIT');
  await fs.writeFile(directory+'/database-before.json',JSON.stringify({createdAt:new Date().toISOString(),tables:snapshot}),{mode:0o600,flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const media=snapshot.find(t=>t.name==='w_media').rows;
  const remote=await remoteList();
  const progress=JSON.parse(await fs.readFile(directory+'/verified.json','utf8').catch(()=> '{}'));
  const originalMedia=media.filter(m=>m.original_key.endsWith('/original'));
  for(let i=0;i<originalMedia.length;i+=6) {
   await Promise.all(originalMedia.slice(i,i+6).map(async m=>{
    const local=path.resolve('.data/deployment-snapshot/media',m.original_key);
    const bytes=await fs.readFile(local),sha256=hash(bytes);
    if(bytes.length!==Number(m.bytes))throw new Error('Local original size mismatch');
    const other=await fs.readFile(path.resolve('.data/production-restore-media',m.original_key));
    if(hash(other)!==sha256)throw new Error('Independent restored backup mismatch');
    const r=remote.find(b=>b.pathname===m.original_key);
    if(!r||r.size!==bytes.length)throw new Error('Remote original missing or different');
    if(progress[m.id]?.sha256!==sha256){
     const response=await get(m.original_key,{token,access:'private',useCache:false});
     if(response?.statusCode!==200||hash(Buffer.from(await new Response(response.stream).arrayBuffer()))!==sha256)throw new Error('Remote original checksum mismatch');
    }
    const dest=path.resolve(directory,'media',m.original_key);await fs.mkdir(path.dirname(dest),{recursive:true,mode:0o700});
    await fs.copyFile(local,dest);await fs.chmod(dest,0o600);
    if(hash(await fs.readFile(dest))!==sha256)throw new Error('Archive copy mismatch');
    progress[m.id]={media_id:m.id,original_key:m.original_key,archive_id:'20261118',sha256,bytes:bytes.length};
   }));
   await fs.writeFile(directory+'/verified.json',JSON.stringify(progress,null,2),{mode:0o600});
   if(i%60===0||i+6>=originalMedia.length)console.log(`Verified original archives ${Object.keys(progress).length}/${originalMedia.length}`);
  }
  const report={verifiedAt:new Date().toISOString(),appURL:config.APP_URL,remoteBytes:remote.reduce((n,b)=>n+b.size,0),remoteFiles:remote.length,originals:originalMedia.map(m=>progress[m.id])};
  await fs.writeFile(directory+'/manifest.json',JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({verified:report.originals.length,removableBytes:report.originals.reduce((n,m)=>n+m.bytes,0),before:report.remoteBytes}));
 } else {
  const manifest=JSON.parse(await fs.readFile(directory+'/manifest.json','utf8'));
  if(manifest.appURL!==config.APP_URL||manifest.originals.length!==645)throw new Error('Archive plan mismatch');
  // Verify every retained private copy again immediately before cloud deletion.
  for(const r of manifest.originals){const bytes=await fs.readFile(path.resolve(directory,'media',r.original_key));if(hash(bytes)!==r.sha256)throw new Error('Archive damaged');}
  await db.query('BEGIN');
  await db.query(await fs.readFile('migrations/002_media_archives.sql','utf8'));
  for(const r of manifest.originals){
   const {rows:[m]}=await db.query('SELECT * FROM w_media WHERE id=$1 FOR SHARE',[r.media_id]);
   if(!m||m.original_key!==r.original_key||Number(m.bytes)!==r.bytes||m.derivatives.some(d=>d.key===r.original_key))throw new Error('Media changed or key used for display');
   await db.query('INSERT INTO w_media_archives(media_id,original_key,archive_id,sha256,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(media_id) DO NOTHING',[r.media_id,r.original_key,r.archive_id,r.sha256,r.bytes]);
  }
  await db.query("INSERT INTO w_audit(actor_id,action,target) VALUES($1,'media.archive-originals',$2)",[owners[0].id,'20261118:645 verified duplicate cloud originals']);
  await db.query('COMMIT');
  const remote=await remoteList(),keys=new Set(remote.map(b=>b.pathname));
  const remove=manifest.originals.filter(r=>keys.has(r.original_key)).map(r=>r.original_key);
  // Exact original keys only. Published and historical derivatives are retained.
  for(let i=0;i<remove.length;i+=100){await del(remove.slice(i,i+100),{token});console.log(`Archived cloud originals ${Math.min(i+100,remove.length)}/${remove.length}`);}
  const after=await remoteList();
  if(after.some(b=>manifest.originals.some(r=>r.original_key===b.pathname)))throw new Error('Cloud original deletion incomplete');
  const report={completedAt:new Date().toISOString(),originalsArchived:manifest.originals.length,beforeBytes:manifest.remoteBytes,afterBytes:after.reduce((n,b)=>n+b.size,0),files:after.length};
  await fs.writeFile(directory+'/result.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));
 }
} catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
