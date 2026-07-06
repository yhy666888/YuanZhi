import { isTauri } from "@/lib/env";
import { SCHEMA_STATEMENTS, MIGRATION_STATEMENTS } from "@/db/schema";

type SqlDb = {
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
  close: () => Promise<void>;
};

let dbInstance: SqlDb | null = null;

export async function getDb(): Promise<SqlDb> {
  if (!isTauri()) throw new Error("SQLite 仅在桌面端可用");
  if (dbInstance) return dbInstance;
  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    console.log("[db] Database.load sqlite:yuanzhi.db");
    const db = (await Database.load("sqlite:yuanzhi.db")) as unknown as SqlDb;
    console.log("[db] loaded, building schema...");
    for (let i = 0; i < SCHEMA_STATEMENTS.length; i++) {
      await db.execute(SCHEMA_STATEMENTS[i]);
      console.log(`[db] schema[${i}] ok`);
    }
    for (const stmt of MIGRATION_STATEMENTS) {
      try {
        await db.execute(stmt);
      } catch {
        /* 列已存在 */
      }
    }
    dbInstance = db;
    console.log("[db] ready, tables created");
    return db;
  } catch (e) {
    console.error("[db] init FAILED:", e);
    throw e;
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function nowISO(): string {
  return new Date().toISOString();
}
