import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
if (existsSync(".env")) {
  console.log(".env가 이미 있습니다. 기존 설정을 유지합니다.");
  process.exit(0);
}
await mkdir(".data", { recursive: true });
const secret = () => randomBytes(32).toString("hex");
const dbPassword = secret();
await writeFile(
  ".env",
  `APP_ENV=development\nNEXT_PUBLIC_APP_ENV=development\nAPP_URL=http://127.0.0.1:3000\nDATABASE_URL=postgresql://wovn:${dbPassword}@127.0.0.1:55432/wovn\nPAYLOAD_SECRET=${secret()}\nRATE_LIMIT_SECRET=${secret()}\nWORKER_SECRET=${secret()}\nSTORAGE_DRIVER=local\nMEDIA_DIRECTORY=.data/media\nMAIL_ADAPTER=test\nALLOW_EXTERNAL_MAIL=false\nTRUST_PROXY=false\nCMS_SCHEMA_PUSH=false\n`,
  { mode: 0o600 },
);
console.log("개발 설정을 .env에 생성했습니다. 비밀값은 출력하지 않습니다.");
