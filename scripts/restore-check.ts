import "../src/lib/env";
import { readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import pg from "pg";
const backup = (await readdir(".backups")).sort().at(-1);
if (!backup) throw new Error("먼저 백업을 실행하세요.");
const database = `wovn_restore_${Date.now()}`,
  url = new URL(process.env.DATABASE_URL!),
  source = new pg.Pool({ connectionString: url.toString() });
await source.query(`CREATE DATABASE "${database}"`);
url.pathname = `/${database}`;
const mediaDirectory = resolve(".data", database, "media");
function run(file: string, env: NodeJS.ProcessEnv, args: string[] = []) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", file, ...args], {
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} failed: ${code}`)),
    );
    child.on("error", reject);
  });
}
try {
  await run(
    "scripts/restore.ts",
    {
      ...process.env,
      RESTORE_DATABASE_URL: url.toString(),
      RESTORE_MEDIA_DIRECTORY: mediaDirectory,
    },
    [resolve(".backups", backup)],
  );
  const restored = new pg.Client({ connectionString: url.toString() });
  await restored.connect();
  const snapshot = JSON.parse(
    await readFile(resolve(".backups", backup, "database.json"), "utf8"),
  );
  for (const table of snapshot.tables) {
    const result = await restored.query(
      `SELECT COUNT(*) FROM "${table.schema}"."${table.name}"`,
    );
    if (Number(result.rows[0].count) !== table.rows.length)
      throw new Error(`행 수 불일치: ${table.name}`);
  }
  const result = await restored.query(
    "SELECT v.data->>'title' AS title FROM w_content c JOIN w_versions v ON v.content_id=c.id AND v.version=c.current_version",
  );
  console.log(
    `복원 데이터 확인: ${snapshot.tables.length}개 테이블 행 수 일치, 초안 ${result.rowCount}건, 미디어 ${snapshot.blobs.length}개 체크섬 일치`,
  );
  await restored.end();
  await run("scripts/verify-restored.ts", {
    ...process.env,
    DATABASE_URL: url.toString(),
    MEDIA_DIRECTORY: mediaDirectory,
    MAIL_ADAPTER: "test",
    APP_ENV: "development",
    CMS_SCHEMA_PUSH: "false",
  });
} finally {
  await source.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  await source.end();
  await rm(resolve(".data", database), { recursive: true, force: true });
}
