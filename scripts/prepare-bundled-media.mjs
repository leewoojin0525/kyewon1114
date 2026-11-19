import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import pg from 'pg';

const config = parseEnv(await fs.readFile('.data/production-runtime.env', 'utf8'));
if (config.APP_URL !== 'https://kyewon1114.vercel.app') throw new Error('Wrong target');
const plan = JSON.parse(await fs.readFile('.data/full-library-20261118/plan.json', 'utf8'));
const db = new pg.Client({connectionString:config.DATABASE_URL_UNPOOLED || config.DATABASE_URL});
const root = path.resolve('.site-media');
await fs.mkdir(root,{recursive:true,mode:0o700});
const entries = {}, copied = new Map();
const hash = b => createHash('sha256').update(b).digest('hex');
async function copy(key, source, expectedHash, expectedBytes) {
  if(copied.has(key))return;
  if(!/^(?:[a-f0-9-]+\/\d+\.webp|packs\/[a-f0-9]{64}\.bin)$/.test(key))throw new Error('Only display derivatives may be bundled');
  const bytes = await fs.readFile(source);
  if(expectedHash && hash(bytes)!==expectedHash)throw new Error('Source checksum mismatch');
  if(expectedBytes && bytes.length!==Number(expectedBytes))throw new Error('Source size mismatch');
  const dest = path.join(root,key);await fs.mkdir(path.dirname(dest),{recursive:true,mode:0o700});await fs.writeFile(dest,bytes,{mode:0o600});
  copied.set(key,bytes.length);
}
try{
 await db.connect();
 for(const b of plan.bundles)await copy(b.key,b.path,b.sha256,b.bytes);
 for(const p of plan.photos){
  if(p.packed)entries[p.key]={key:p.packed.key,offset:p.packed.offset,bytes:p.bytes,sha256:p.sha256};
  else{await copy(p.key,p.output,p.sha256,p.bytes);entries[p.key]={key:p.key,bytes:p.bytes,sha256:p.sha256};}
 }
 const {rows:otherMedia}=await db.query("SELECT DISTINCT m.* FROM w_media m JOIN w_media_refs r ON r.media_id=m.id JOIN w_content c ON c.id=r.content_id WHERE c.kind<>'projects'");
 for(const m of otherMedia)for(const d of m.derivatives){
  if(entries[d.key])continue;
  if(d.packed)throw new Error('Unexpected packed Press media');
  const source=path.resolve('.data/verified-backup-media-20261118',d.key),bytes=await fs.readFile(source),sha256=hash(bytes);
  await copy(d.key,source,sha256,d.bytes);entries[d.key]={key:d.key,bytes:bytes.length,sha256};
 }
 const manifest={format:1,createdAt:new Date().toISOString(),entries};
 await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
 const summary={logicalImages:Object.keys(entries).length,physicalFiles:copied.size,bytes:[...copied.values()].reduce((a,b)=>a+b,0),projects:25,projectPhotos:908,pressMedia:otherMedia.length};
 await fs.writeFile('.data/full-library-20261118/bundled-media-summary.json',JSON.stringify(summary,null,2),{mode:0o600});console.log(summary);
}finally{await db.end();}
