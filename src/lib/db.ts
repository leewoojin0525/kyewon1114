import "./env";
import pg, { type PoolClient } from "pg";
const globalDB = globalThis as unknown as { wovnPool?: pg.Pool };
export const pool = (globalDB.wovnPool ??= new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
}));
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export type Actor = {
  id: number;
  role: "owner" | "editor";
  name?: string;
  email?: string;
};
export function owner(actor: Actor) {
  if (actor.role !== "owner")
    throw new AppError(403, "대표 계정에서만 할 수 있는 작업입니다.");
}
export async function audit(
  db: PoolClient,
  actor: Actor | null,
  action: string,
  target: string,
) {
  await db.query(
    "INSERT INTO w_audit(actor_id, action, target) VALUES ($1,$2,$3)",
    [actor?.id ?? null, action, target],
  );
}
