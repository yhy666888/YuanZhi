import { getDb, newId, nowISO } from "./db";
import type { Todo } from "@/lib/types";

interface RawRow {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  due_at: string | null;
  reminder_enabled: number;
  tag: string | null;
  done: number;
  created_at: string;
  updated_at: string;
  deleted: number;
}

function mapRow(r: RawRow): Todo {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    priority: r.priority,
    due_at: r.due_at,
    reminder_enabled: !!r.reminder_enabled,
    tag: r.tag,
    done: !!r.done,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted: !!r.deleted,
  };
}

/** 全部待办，按时间升序（无时间靠后） */
export async function listTodos(): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM todos WHERE deleted=0 ORDER BY (due_at IS NULL), due_at ASC, created_at ASC"
  );
  return rows.map(mapRow);
}

/** 首页待办：按即将到期排序取前5条，无截止时间的按添加顺序排后 */
export async function listTopTodos(limit = 5): Promise<Todo[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM todos WHERE deleted=0 AND done=0 ORDER BY (due_at IS NULL), due_at ASC, created_at ASC LIMIT ?",
    [limit]
  );
  return rows.map(mapRow);
}

export interface TodoInput {
  title: string;
  notes?: string | null;
  priority?: number;
  due_at?: string | null;
  reminder_enabled?: boolean;
  tag?: string | null;
}

export async function addTodo(input: TodoInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = nowISO();
  await db.execute(
    "INSERT INTO todos (id, title, notes, priority, due_at, reminder_enabled, tag, done, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)",
    [
      id,
      input.title,
      input.notes ?? null,
      input.priority ?? 1,
      input.due_at ?? null,
      input.reminder_enabled ? 1 : 0,
      input.tag ?? null,
      ts,
      ts,
    ]
  );
  return id;
}

export async function updateTodo(
  id: string,
  patch: Partial<TodoInput> & { done?: boolean }
): Promise<void> {
  const db = await getDb();
  const ts = nowISO();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push("title=?");
    vals.push(patch.title);
  }
  if (patch.notes !== undefined) {
    sets.push("notes=?");
    vals.push(patch.notes);
  }
  if (patch.priority !== undefined) {
    sets.push("priority=?");
    vals.push(patch.priority);
  }
  if (patch.due_at !== undefined) {
    sets.push("due_at=?");
    vals.push(patch.due_at);
  }
  if (patch.reminder_enabled !== undefined) {
    sets.push("reminder_enabled=?");
    vals.push(patch.reminder_enabled ? 1 : 0);
  }
  if (patch.tag !== undefined) {
    sets.push("tag=?");
    vals.push(patch.tag);
  }
  if (patch.done !== undefined) {
    sets.push("done=?");
    vals.push(patch.done ? 1 : 0);
  }
  if (sets.length === 0) return;
  sets.push("updated_at=?");
  vals.push(ts, id);
  await db.execute(`UPDATE todos SET ${sets.join(", ")} WHERE id=?`, vals);
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE todos SET deleted=1, updated_at=? WHERE id=?", [
    nowISO(),
    id,
  ]);
}
