import "../src/lib/env";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";
const directory = process.argv[2],
  targetURL = process.env.RESTORE_DATABASE_URL,
  targetMedia = process.env.RESTORE_MEDIA_DIRECTORY;
if (!directory || !targetURL || !targetMedia)
  throw new Error(
    "사용: RESTORE_DATABASE_URL / RESTORE_MEDIA_DIRECTORY를 안전하게 설정하고 pnpm restore <백업 디렉터리>",
  );
if (
  targetURL === process.env.DATABASE_URL ||
  resolve(targetMedia) === resolve(process.env.MEDIA_DIRECTORY || ".data/media")
)
  throw new Error(
    "현재 운영 데이터에 덮어쓸 수 없습니다. 별도 빈 DB와 미디어 경로를 사용하세요.",
  );
try {
  if ((await readdir(targetMedia)).length)
    throw new Error("복원 미디어 디렉터리가 비어 있지 않습니다.");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const raw = await readFile(resolve(directory, "database.json"), "utf8"),
  manifest = JSON.parse(
    await readFile(resolve(directory, "manifest.json"), "utf8"),
  );
if (createHash("sha256").update(raw).digest("hex") !== manifest.sha256)
  throw new Error("백업 DB 체크섬 불일치");
const backup = JSON.parse(raw);
if (backup.format !== 1) throw new Error("지원하지 않는 백업 형식");
for (const blob of backup.blobs) {
  if (!/^[a-f0-9-]+\/(original|\d+\.webp)$/.test(blob.key))
    throw new Error("잘못된 미디어 키");
  const data = await readFile(resolve(directory, "media", blob.key));
  if (createHash("sha256").update(data).digest("hex") !== blob.sha256)
    throw new Error("미디어 체크섬 불일치");
}
const client = new pg.Client({ connectionString: targetURL });
await client.connect();
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
try {
  const occupied = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema IN ('public','cms') LIMIT 1",
  );
  if (occupied.rowCount)
    throw new Error("복원 대상 앱 스키마(public/cms)는 비어 있어야 합니다.");
  await client.query("BEGIN");
  for (const sql of backup.schema) await client.query(sql);
  // Migrations seed metadata; restore its exact snapshot below.
  await client.query("DELETE FROM w_migrations");
  for (const name of backup.order) {
    const table = backup.tables.find(
      (t: any) => `${t.schema}.${t.name}` === name,
    );
    const tableName = `${quote(table.schema)}.${quote(table.name)}`;
    for (const row of table.rows) {
      const columns = table.columns.map((c: any) => c.name);
      const values = table.columns.map((c: any) =>
        c.type === "jsonb" || c.type === "json"
          ? JSON.stringify(row[c.name])
          : row[c.name],
      );
      await client.query(
        `INSERT INTO ${tableName} (${columns.map(quote).join(",")}) VALUES(${columns.map((_: string, i: number) => `$${i + 1}`).join(",")})`,
        values,
      );
    }
    for (const col of table.columns) {
      const {
        rows: [r],
      } = await client.query(
        "SELECT pg_get_serial_sequence($1,$2) AS sequence",
        [`${table.schema}.${table.name}`, col.name],
      );
      if (r.sequence)
        await client.query(
          `SELECT setval($1, COALESCE((SELECT MAX(${quote(col.name)}) FROM ${tableName}),1), EXISTS(SELECT 1 FROM ${tableName}))`,
          [r.sequence],
        );
    }
  }
  for (const blob of backup.blobs) {
    const target = resolve(targetMedia, blob.key);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(
      target,
      await readFile(resolve(directory, "media", blob.key)),
      { flag: "wx", mode: 0o600 },
    );
  }
  await client.query("COMMIT");
  console.log(
    `별도 환경 복원 완료 · ${backup.tables.length} 테이블 · ${backup.blobs.length} 파일. 복원 앱의 MAIL_ADAPTER=test를 유지하세요.`,
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}
