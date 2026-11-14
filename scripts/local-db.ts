import "../src/lib/env";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const url = new URL(process.env.DATABASE_URL!);
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("로컬 DB 주소만 허용합니다.");
const pg = new EmbeddedPostgres({
  databaseDir: ".data/postgres",
  user: url.username,
  password: url.password,
  port: Number(url.port),
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(".data/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const dbName = url.pathname.slice(1);
const exists = await client.query(
  "SELECT 1 FROM pg_database WHERE datname=$1",
  [dbName],
);
await client.end();
if (!exists.rowCount) await pg.createDatabase(dbName);
console.log(`로컬 PostgreSQL 실행 중 · 127.0.0.1:${url.port} · .data/postgres`);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
