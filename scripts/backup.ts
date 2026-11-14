import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { pool } from "../src/lib/db";
import { getBlob } from "../src/lib/media";
const directory = resolve(
  ".backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(directory, { recursive: true, mode: 0o700 });
const client = await pool.connect();
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  await client.query("LOCK TABLE w_media IN SHARE MODE");
  const { rows: tables } = await client.query(
    "SELECT table_schema AS schema,table_name AS name FROM information_schema.tables WHERE table_type='BASE TABLE' AND (table_schema='cms' OR (table_schema='public' AND table_name LIKE 'w\_%')) ORDER BY table_schema,table_name",
  );
  const exported = [];
  for (const table of tables) {
    const { rows: columns } = await client.query(
      "SELECT column_name AS name,data_type AS type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position",
      [table.schema, table.name],
    );
    const { rows } = await client.query(
      `SELECT * FROM ${quote(table.schema)}.${quote(table.name)}`,
    );
    exported.push({ ...table, columns, rows });
  }
  const { rows: constraints } = await client.query(
    "SELECT ns.nspname||'.'||c.relname AS child, rn.nspname||'.'||rc.relname AS parent FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace JOIN pg_class rc ON rc.oid=co.confrelid JOIN pg_namespace rn ON rn.oid=rc.relnamespace WHERE co.contype='f'",
  );
  const remaining = new Set(tables.map((t) => `${t.schema}.${t.name}`)),
    order: string[] = [];
  while (remaining.size) {
    const next = [...remaining].find(
      (t) =>
        !constraints.some(
          (c) => c.child === t && c.parent !== t && remaining.has(c.parent),
        ),
    );
    if (!next) throw new Error("외래 키 순환: 백업 순서를 검토하세요.");
    order.push(next);
    remaining.delete(next);
  }
  const blobs = [];
  for (const m of exported.find((t) => t.name === "w_media")?.rows || [])
    for (const key of [
      m.original_key,
      ...m.derivatives.map((d: { key: string }) => d.key),
    ]) {
      const buffer = await getBlob(key),
        target = resolve(directory, "media", key);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, buffer, { mode: 0o600 });
      blobs.push({
        key,
        sha256: createHash("sha256").update(buffer).digest("hex"),
      });
    }
  await client.query("COMMIT");
  const { readdir } = await import("node:fs/promises");
  const sqlFiles = (await readdir("migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
  const cmsFile = await readFile(
    "src/cms-migrations/20261114_054325_initial.ts",
    "utf8",
  );
  const cmsSQL = cmsFile.match(/await db\.execute\(sql`([\s\S]*?)`\)/)![1];
  const data = JSON.stringify({
    format: 1,
    createdAt: new Date().toISOString(),
    schema: [
      ...(await Promise.all(
        sqlFiles.map((f) => readFile(`migrations/${f}`, "utf8")),
      )),
      cmsSQL,
    ],
    tables: exported,
    order,
    blobs,
  });
  await writeFile(resolve(directory, "database.json"), data, { mode: 0o600 });
  await writeFile(
    resolve(directory, "manifest.json"),
    JSON.stringify(
      {
        sha256: createHash("sha256").update(data).digest("hex"),
        tables: exported.length,
        blobs: blobs.length,
        format: 1,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    `백업 완료: ${directory} · ${exported.length} 테이블 · ${blobs.length} 미디어 파일`,
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  client.release();
  await pool.end();
}
