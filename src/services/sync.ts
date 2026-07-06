import { invoke } from "@tauri-apps/api/core";
import { getDb } from "./db";
import type { AppSettings } from "@/lib/types";

/** 参与同步的表（pomodoro_sessions 无 updated_at，按 id 幂等 upsert） */
const SYNC_TABLES_WITH_TS = [
  "todos",
  "memos",
  "account_categories",
  "accounts",
  "plans",
  "anniversaries",
];
const SYNC_TABLES_IDEMPOTENT = ["pomodoro_sessions"];

export async function localDbPath(): Promise<string> {
  return invoke<string>("local_db_path");
}

interface SyncResult {
  pulled: boolean;
  pushed: boolean;
  merged: number;
}

export async function syncWithWebdav(
  settings: AppSettings
): Promise<SyncResult> {
  if (
    !settings.webdav_url ||
    !settings.webdav_username ||
    !settings.webdav_password
  ) {
    throw new Error("WebDAV 未配置");
  }

  const remoteFile = `${settings.webdav_path.replace(/\/$/, "")}/yuanzhi.db`;
  let merged = 0;

  // 1. 拉取远端 db 到临时文件
  const remotePath = await invoke<string>("webdav_download", {
    url: settings.webdav_url,
    user: settings.webdav_username,
    pass: settings.webdav_password,
    remotePath: remoteFile,
  }).catch(() => "");

  const local = await getDb();

  // 2. 记录级 LWW 合并
  if (remotePath) {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    const remote = await Database.load(`sqlite:${remotePath}`);
    try {
      for (const table of SYNC_TABLES_WITH_TS) {
        const rows = await remote.select<Record<string, unknown>[]>(
          `SELECT * FROM ${table}`
        );
        for (const row of rows) {
          const id = row.id as string;
          const remoteTs = row.updated_at as string;
          const existing = await local.select<{ updated_at: string }[]>(
            `SELECT updated_at FROM ${table} WHERE id=?`,
            [id]
          );
          if (existing.length && existing[0].updated_at >= remoteTs) {
            continue;
          }
          const cols = Object.keys(row);
          const placeholders = cols.map(() => "?").join(",");
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(
            ","
          )}) VALUES (${placeholders})`;
          await local.execute(sql, cols.map((c) => row[c]));
          merged++;
        }
      }
      for (const table of SYNC_TABLES_IDEMPOTENT) {
        const rows = await remote.select<Record<string, unknown>[]>(
          `SELECT * FROM ${table}`
        );
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => "?").join(",");
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(
            ","
          )}) VALUES (${placeholders})`;
          await local.execute(sql, cols.map((c) => row[c]));
          merged++;
        }
      }
    } finally {
      await remote.close();
    }
  }

  // 3. 推送本地 db 到远端
  const localPath = await localDbPath();
  await invoke("webdav_upload", {
    url: settings.webdav_url,
    user: settings.webdav_username,
    pass: settings.webdav_password,
    remotePath: remoteFile,
    localPath,
  });

  return { pulled: !!remotePath, pushed: true, merged };
}
