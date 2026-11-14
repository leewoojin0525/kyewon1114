import { getPayload } from "payload";
import config from "../payload.config";
import { AppError, type Actor } from "./db";
export async function cms() {
  return getPayload({ config });
}
export async function authenticate(headers: Headers): Promise<Actor> {
  const payload = await cms();
  const { user } = await payload.auth({ headers });
  if (!user) throw new AppError(401, "로그인이 필요합니다.");
  const account = await payload.findByID({
    collection: "users",
    id: user.id,
    user,
    overrideAccess: false,
  });
  if (!account.active || !["owner", "editor"].includes(account.role))
    throw new AppError(403, "계정을 사용할 수 없습니다.");
  return {
    id: Number(account.id),
    name: account.name,
    email: account.email,
    role: account.role as Actor["role"],
  };
}
