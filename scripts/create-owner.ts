import "../src/lib/env";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { cms } from "../src/lib/auth";
const payload = await cms();
const existing = await payload.find({
  collection: "users",
  where: { role: { equals: "owner" } },
  limit: 1,
  overrideAccess: true,
});
if (existing.totalDocs)
  throw new Error("대표 계정이 이미 있습니다. 로그인 후 계정을 관리하세요.");
const io = createInterface({ input: process.stdin, output: process.stdout });
const name = await io.question("대표 이름: "),
  email = await io.question("로그인 이메일: ");
io.close();
let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const secure = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
process.stdout.write("비밀번호 (12자 이상, 입력 숨김): ");
muted = true;
const password = await secure.question("");
secure.close();
process.stdout.write("\n");
if (password.length < 12) throw new Error("비밀번호는 12자 이상이어야 합니다.");
// CLI bootstrap only. Never exposed as HTTP signup or checked-in credentials.
await payload.create({
  collection: "users",
  data: { name, email, password, role: "owner", active: true },
  overrideAccess: true,
});
console.log("대표 계정을 생성했습니다. /admin에서 로그인하세요.");
process.exit(0);
