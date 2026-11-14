import "./lib/env";
import { buildConfig, type Access } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { ko } from "@payloadcms/translations/languages/ko";
import { en } from "@payloadcms/translations/languages/en";
import { appURL, required } from "./lib/env";
import { resolve } from "node:path";

const isOwner: Access = ({ req }) =>
  Boolean(req.user && req.user.active !== false && req.user.role === "owner");
export default buildConfig({
  secret: required("PAYLOAD_SECRET"),
  serverURL: appURL,
  routes: { admin: "/cms", api: "/api/cms" },
  admin: {
    user: "users",
    meta: { titleSuffix: "— WOVN 계정 관리" },
    importMap: { baseDir: resolve(process.cwd(), "src") },
  },
  i18n: { supportedLanguages: { ko, en }, fallbackLanguage: "ko" },
  graphQL: { disable: true },
  csrf: [appURL],
  cors: [appURL],
  db: postgresAdapter({
    pool: { connectionString: required("DATABASE_URL") },
    schemaName: "cms",
    push: process.env.CMS_SCHEMA_PUSH === "true",
    migrationDir: resolve(process.cwd(), "src/cms-migrations"),
  }),
  typescript: { outputFile: resolve(process.cwd(), "src/payload-types.ts") },
  collections: [
    {
      slug: "users",
      labels: { singular: "운영 계정", plural: "운영 계정" },
      auth: {
        tokenExpiration: 7200,
        maxLoginAttempts: 5,
        lockTime: 900000,
        cookies: { secure: appURL.startsWith("https:"), sameSite: "Strict" },
        useSessions: true,
      },
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "email", "role", "active"],
      },
      access: {
        create: isOwner,
        update: isOwner,
        delete: isOwner,
        read: ({ req }) =>
          req.user?.active !== false && req.user
            ? req.user.role === "owner"
              ? true
              : { id: { equals: req.user.id } }
            : false,
        admin: ({ req }) =>
          Boolean(req.user?.active !== false && req.user?.role === "owner"),
      },
      hooks: {
        beforeLogin: [
          ({ user }) => {
            if (!user.active) throw new Error("비활성화된 계정입니다.");
          },
        ],
      },
      fields: [
        { name: "name", label: "이름", type: "text", required: true },
        {
          name: "role",
          label: "역할",
          type: "select",
          required: true,
          defaultValue: "editor",
          options: [
            { label: "대표", value: "owner" },
            { label: "직원", value: "editor" },
          ],
          access: {
            create: ({ req }) => Boolean(req.user?.role === "owner"),
            update: ({ req }) => Boolean(req.user?.role === "owner"),
          },
        },
        {
          name: "active",
          label: "활성 계정",
          type: "checkbox",
          defaultValue: true,
          required: true,
        },
      ],
    },
  ],
  telemetry: false,
  email: () => ({
    name: "disabled-auth-email",
    defaultFromAddress: "disabled@localhost.invalid",
    defaultFromName: "WOVN",
    sendEmail: async () => {
      throw new Error(
        "Account email is disabled; use the authenticated owner reset workflow.",
      );
    },
  }),
});
