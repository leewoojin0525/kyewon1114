import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import pg from 'pg';
const config = parseEnv(await fs.readFile('.data/production-runtime.env', 'utf8'));
const db = new pg.Client({ connectionString: config.DATABASE_URL_UNPOOLED || config.DATABASE_URL });
await db.connect();
try {
  await db.query('BEGIN READ ONLY');
  const { rows: content } = await db.query("SELECT c.*,v.data FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.published_version WHERE c.kind='projects' AND c.published_version IS NOT NULL ORDER BY (v.data->>'order')::int, v.data->>'title'");
  const { rows: media } = await db.query('SELECT * FROM w_media');
  const { rows: owners } = await db.query("SELECT id,role,active FROM cms.users WHERE role='owner' AND active=true");
  await db.query('COMMIT');
  const projects = content.map(c => {
    const photos = [];
    if (c.data.hero) photos.push({ ...c.data.hero, placement: 'cover', order: 1 });
    for (const [i,b] of c.data.blocks.entries()) {
      if (b.type === 'image') photos.push({ ...b.image, placement: `blocks.${i}.image`, order: photos.length+1 });
      if (b.type === 'pair') for (const side of ['left','right']) photos.push({ ...b[side], placement: `blocks.${i}.${side}`, order: photos.length+1 });
    }
    return { ...c, photos };
  });
  const root = '.data/photo-replacement-20261118';
  await fs.mkdir(root,{recursive:true,mode:0o700});
  await fs.writeFile(root+'/live-before.json',JSON.stringify({checkedAt:new Date().toISOString(),projects,media,owners},null,2),{mode:0o600,flag:'wx'});
  const used=new Set(projects.flatMap(p=>p.photos.map(f=>f.id)));
  console.log(JSON.stringify({projects:projects.map(p=>({title:p.data.title,slug:p.public_slug,version:p.published_version,draftVersion:p.current_version,photos:p.photos.length})),totalPhotos:projects.reduce((n,p)=>n+p.photos.length,0),uniqueImages:used.size,projectOriginalBytes:media.filter(m=>used.has(m.id)).reduce((n,m)=>n+Number(m.bytes),0),projectDisplayBytes:media.filter(m=>used.has(m.id)).reduce((n,m)=>n+m.derivatives.reduce((a,d)=>a+d.bytes,0),0),activeOwnerCount:owners.length},null,2));
} finally { await db.end(); }
