import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const configuration = parseEnv(
  await readFile(".data/production-runtime.env", "utf8"),
);
const email = process.env.PRODUCTION_OWNER_EMAIL;
if (!email || !configuration.DATABASE_URL)
  throw new Error("Production owner and database are required");
const source = resolve(".data/deployment-snapshot");
await new Promise<void>((done, reject) => {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/restore.ts", source],
    {
      env: {
        ...process.env,
        RESTORE_DATABASE_URL:
          configuration.DATABASE_URL_UNPOOLED || configuration.DATABASE_URL,
        RESTORE_MEDIA_DIRECTORY: resolve(".data/production-restore-media"),
      },
      stdio: "inherit",
    },
  );
  child.on("exit", (code) =>
    code === 0
      ? done()
      : reject(new Error("Production snapshot restore failed")),
  );
  child.on("error", reject);
});
Object.assign(process.env, configuration);
const { cms } = await import("../src/lib/auth");
const { pool } = await import("../src/lib/db");
const payload = await cms();
const owners = await payload.find({
  collection: "users",
  where: { role: { equals: "owner" } },
  limit: 1,
  overrideAccess: true,
});
if (owners.totalDocs !== 1 || owners.docs[0].active)
  throw new Error("Expected one inactive imported owner");
const password = randomBytes(24).toString("base64url");
const user = await payload.update({
  collection: "users",
  id: owners.docs[0].id,
  data: { email, password, name: "이우진", active: true },
  overrideAccess: true,
});
await payload.login({ collection: "users", data: { email, password } });
await pool.query("DELETE FROM cms.users_sessions WHERE _parent_id=$1", [
  user.id,
]);
await writeFile(
  ".data/production-access.json",
  JSON.stringify(
    { adminUrl: configuration.APP_URL + "/admin", email, password },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
const { rows } = await pool.query(
  "SELECT kind,COUNT(*) FILTER(WHERE published_version IS NOT NULL)::int AS published FROM w_content GROUP BY kind ORDER BY kind",
);
console.log(
  JSON.stringify({
    initialized: true,
    content: rows,
    ownerLoginVerified: true,
    credentialsFile: ".data/production-access.json",
  }),
);
await pool.end();
process.exit(0);
