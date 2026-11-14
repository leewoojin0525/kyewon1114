import { randomBytes } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import { cms } from "../src/lib/auth";
import { appEnv } from "../src/lib/env";
if (appEnv !== "development")
  throw new Error("로컬 개발 환경에서만 시험 계정을 생성할 수 있습니다.");
try {
  await access(".data/local-access.json");
  console.log("기존 .data/local-access.json을 사용하세요.");
  process.exit(0);
} catch {}
const payload = await cms(),
  accounts = [];
for (const role of ["owner", "editor"] as const) {
  const password = randomBytes(24).toString("base64url"),
    email = `${role}@local.wovn.test`,
    name = role === "owner" ? "로컬 시험 대표" : "로컬 시험 직원";
  const result = await payload.create({
    collection: "users",
    data: { name, email, password, role, active: true },
    overrideAccess: true,
  });
  accounts.push({ id: result.id, name, email, password, role });
}
await mkdir(".data", { recursive: true, mode: 0o700 });
await writeFile(
  ".data/local-access.json",
  JSON.stringify(
    {
      notice: "로컬 시험 전용입니다. 운영 계정으로 사용하지 마세요.",
      accounts,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  "무작위 비밀번호의 개별 로컬 계정 생성 완료 · .data/local-access.json (본인만 읽기)",
);
process.exit(0);
