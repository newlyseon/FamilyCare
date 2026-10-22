import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Fluid Compute가 인스턴스를 멈추기 전에 유휴 연결을 정리하게 한다.
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

let db: ReturnType<typeof createDb> | null = null;

// 빌드 시점에 DATABASE_URL 없이도 import가 깨지지 않도록 처음 쓸 때 만든다.
export function getDb() {
  db ??= createDb();
  return db;
}
