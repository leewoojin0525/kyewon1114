import { pool } from "../src/lib/db";
let ready = false;
for (let i = 0; i < 40; i++) {
  try {
    await pool.query("SELECT 1");
    ready = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
await pool.end();
if (!ready) throw new Error("로컬 DB가 시작되지 않았습니다.");
