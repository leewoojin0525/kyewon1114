import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseEnv, isDeepStrictEqual } from "node:util";
import { put, get, list } from "@vercel/blob";
const config = parseEnv(await readFile(".data/production-runtime.env", "utf8"));
if (config.APP_URL !== "https://kyewon1114.vercel.app" || config.STORAGE_DRIVER !== "vercel-blob") throw new Error("Wrong production target");
Object.assign(process.env, config);
const { pool } = await import("../src/lib/db");
const { getDraft, saveDraft, workflow } = await import("../src/lib/content");
const { parseContent } = await import("../src/lib/model");
const root = ".data/photo-replacement-20261118";
const plan = JSON.parse(await readFile(root + "/replacement-plan.json", "utf8"));
const mode = process.argv[2] || "check";
if (!["check", "upload", "publish", "verify"].includes(mode)) throw new Error("Invalid mode");
const hash = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const same = isDeepStrictEqual;
const replacements = new Map<string, string>(plan.photos.map((p: any) => [p.oldId, p.newId]));
function replace(value: any): any {
  if (Array.isArray(value)) return value.map(replace);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, (k === "id" || k === "mobileId") && typeof v === "string" && replacements.has(v) ? replacements.get(v) : replace(v)]));
  return value;
}
async function checkpoint(path: string, data: unknown) { await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 }); }
try {
  const {rows: owners} = await pool.query("SELECT id,role FROM cms.users WHERE role='owner' AND active=true");
  if (owners.length !== 1) throw new Error("Expected one active owner");
  const actor = owners[0];
  // Pin the exact reviewed content versions before any write. A changed draft stops the run.
  for (const p of plan.projects) {
    const current = await getDraft(p.id);
    const desired = parseContent("projects", replace(p.data));
    const already = current.current_version === p.expectedVersion + 1 && current.published_version === current.current_version && same(current.data, desired);
    if (!already && (current.current_version !== p.expectedVersion || current.published_version !== p.publishedVersion || !same(current.data, p.data))) throw new Error(`Content changed: ${p.slug}`);
  }
  if (mode === "upload") {
    const token = config.BLOB_READ_WRITE_TOKEN;
    const donePath = root + "/upload-progress.json";
    const done = JSON.parse(await readFile(donePath, "utf8").catch(() => "{}"));
    let cursor: string | undefined; const remote = new Map<string, number>();
    do { const r = await list({ token, cursor, limit: 1000 }); for (const b of r.blobs) remote.set(b.pathname, b.size); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
    const pendingBytes = plan.photos.filter((p: any) => !remote.has(p.key)).reduce((n: number,p: any) => n+p.bytes,0);
    if ([...remote.values()].reduce((a,b) => a+b,0)+pendingBytes >= 950_000_000) throw new Error("Free storage headroom insufficient");
    for (let i=0;i<plan.photos.length;i+=4) {
      await Promise.all(plan.photos.slice(i,i+4).map(async (p: any) => {
        const bytes = await readFile(p.output);
        if (hash(bytes) !== p.sha256) throw new Error("Prepared photo changed");
        if (!remote.has(p.key)) await put(p.key, bytes, { token, access: "private", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: false });
        if (done[p.newId] !== p.sha256) {
          const r = await get(p.key,{token,access:"private",useCache:false});
          if(r?.statusCode!==200 || hash(Buffer.from(await new Response(r.stream).arrayBuffer()))!==p.sha256) throw new Error("Uploaded photo checksum mismatch");
        }
        // The stripped web master is also the display derivative: store these identical bytes once.
        const derivatives=[{width:p.width,height:p.height,key:p.key,bytes:p.bytes}];
        await pool.query("INSERT INTO w_media(id,original_key,mime,bytes,width,height,derivatives,uploaded_by) VALUES($1,$2,'image/webp',$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING",[p.newId,p.key,p.bytes,p.width,p.height,JSON.stringify(derivatives),actor.id]);
        const {rows:[m]}=await pool.query("SELECT * FROM w_media WHERE id=$1",[p.newId]);
        if(m.original_key!==p.key||Number(m.bytes)!==p.bytes||!same(m.derivatives,derivatives))throw new Error("Existing media differs");
        done[p.newId]=p.sha256;
      }));
      await checkpoint(donePath,done);
      if(i%40===0||i+4>=plan.photos.length)console.log(`Verified web photos ${Object.keys(done).length}/${plan.photos.length}`);
    }
  } else if(mode === "publish") {
    const done = JSON.parse(await readFile(root+"/upload-progress.json","utf8"));
    if(plan.photos.some((p:any)=>done[p.newId]!==p.sha256))throw new Error("Uploads not fully verified");
    const published=[];
    for(const p of plan.projects){
      const desired=parseContent("projects",replace(p.data));
      const current=await getDraft(p.id);
      if(current.current_version===p.expectedVersion&&current.published_version===p.publishedVersion&&same(current.data,p.data)){
        const saved=await saveDraft(actor,p.id,p.expectedVersion,desired);
        await workflow(actor,p.id,"review",saved.version);
        await workflow(actor,p.id,"publish",saved.version);
      } else if(!(current.current_version===p.expectedVersion+1&&current.published_version===current.current_version&&same(current.data,desired)))throw new Error("Unexpected version during publish");
      published.push({id:p.id,title:p.title,version:p.expectedVersion+1,photos:plan.photos.filter((r:any)=>r.projectId===p.id).length});
      await checkpoint(root+"/publication-result.json",{updatedAt:new Date().toISOString(),published});
      console.log(`Applied ${p.title}`);
    }
  } else if(mode === "verify") {
    const checks: {number: string; sha256: string; status: number}[]=[];
    for(let i=0;i<plan.photos.length;i+=6){
      await Promise.all(plan.photos.slice(i,i+6).map(async(p:any)=>{
        const response=await fetch(plan.appURL+"/media/"+p.key,{signal:AbortSignal.timeout(60000)});
        const bytes=Buffer.from(await response.arrayBuffer());
        if(response.status!==200||hash(bytes)!==p.sha256)throw new Error(`Public image failed: ${p.number}`);
        checks.push({number:p.number,sha256:p.sha256,status:response.status});
      }));
      if(i%60===0||i+6>=plan.photos.length)console.log(`Public images verified ${checks.length}/${plan.photos.length}`);
    }
    for(const p of plan.projects){const d=await getDraft(p.id);if(d.published_version!==p.expectedVersion+1||!same(d.data,parseContent("projects",replace(p.data))))throw new Error("Published content differs");}
    let cursor: string | undefined; const blobs=[];
    do{const r=await list({token:config.BLOB_READ_WRITE_TOKEN,cursor,limit:1000});blobs.push(...r.blobs);cursor=r.hasMore?r.cursor:undefined;}while(cursor);
    const result={verifiedAt:new Date().toISOString(),projects:plan.projects.length,photos:checks.length,webBytes:plan.photos.reduce((n:number,p:any)=>n+p.bytes,0),storageBytes:blobs.reduce((n,b)=>n+b.size,0),storageFiles:blobs.length,checks};
    await checkpoint(root+"/final-verification.json",result);
    console.log(JSON.stringify({...result,checks:undefined}));
  } else console.log("Reviewed plan matches all 22 current project versions");
} finally { await pool.end(); }
