import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
if (existsSync(".env")) loadEnvFile(".env");
export const appEnv = process.env.APP_ENV || "development";
export const isLive = appEnv === "production";
export const appURL = (process.env.APP_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다.`);
  return value;
}
