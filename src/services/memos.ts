import { getDb, newId, nowISO } from "./db";
import type { Memo, MemoFormat } from "@/lib/types";

interface RawRow {
  id: string;
  title: string;
  content_html: string;
  content_md: string;
  format: string;
  color: string;
  pinned: number;
  created_at: string;
  updated_at: string;
  deleted: number;
}

function mapRow(r: RawRow): Memo {
  return {
    id: r.id,
    title: r.title,
    content_html: r.content_html,
    content_md: r.content_md,
    format: r.format as MemoFormat,
    color: r.color,
    pinned: !!r.pinned,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted: !!r.deleted,
  };
}

export async function listMemos(): Promise<Memo[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM memos WHERE deleted=0 ORDER BY pinned DESC, updated_at DESC"
  );
  return rows.map(mapRow);
}

export async function getMemo(id: string): Promise<Memo | null> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM memos WHERE id=? AND deleted=0",
    [id]
  );
  return rows.length ? mapRow(rows[0]) : null;
}

export interface MemoInput {
  title: string;
  content_html: string;
  content_md: string;
  format: MemoFormat;
  color: string;
  pinned?: boolean;
}

export async function addMemo(input: MemoInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = nowISO();
  await db.execute(
    "INSERT INTO memos (id, title, content_html, content_md, format, color, pinned, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
    [
      id,
      input.title,
      input.content_html,
      input.content_md,
      input.format,
      input.color,
      input.pinned ? 1 : 0,
      ts,
      ts,
    ]
  );
  return id;
}

export async function updateMemo(
  id: string,
  patch: Partial<MemoInput>
): Promise<void> {
  const db = await getDb();
  const ts = nowISO();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) { sets.push("title=?"); vals.push(patch.title); }
  if (patch.content_html !== undefined) { sets.push("content_html=?"); vals.push(patch.content_html); }
  if (patch.content_md !== undefined) { sets.push("content_md=?"); vals.push(patch.content_md); }
  if (patch.format !== undefined) { sets.push("format=?"); vals.push(patch.format); }
  if (patch.color !== undefined) { sets.push("color=?"); vals.push(patch.color); }
  if (patch.pinned !== undefined) { sets.push("pinned=?"); vals.push(patch.pinned ? 1 : 0); }
  if (sets.length === 0) return;
  sets.push("updated_at=?");
  vals.push(ts, id);
  await db.execute(`UPDATE memos SET ${sets.join(", ")} WHERE id=?`, vals);
}

export async function deleteMemo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE memos SET deleted=1, updated_at=? WHERE id=?", [
    nowISO(),
    id,
  ]);
}
