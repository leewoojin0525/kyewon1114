import { pool, transaction } from "../src/lib/db";
import { readFile, readdir } from "node:fs/promises";
for (const file of (await readdir("migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(7711414)");
    await db.query(await readFile(`migrations/${file}`, "utf8"));
  });
  console.log(`적용: ${file}`);
}
await pool.end();
