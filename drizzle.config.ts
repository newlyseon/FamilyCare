import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  // 마이그레이션은 풀러가 아닌 직접 연결로 실행한다.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
