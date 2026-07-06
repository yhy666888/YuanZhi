import { getDb, newId, nowISO } from "./db";
import type { Anniversary } from "@/lib/types";

interface RawRow {
  id: string;
  name: string;
  date: string;
  kind: string;
  repeat_yearly: number;
  created_at: string;
  updated_at: string;
  deleted: number;
}

function mapRow(r: RawRow): Anniversary {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    kind: r.kind as Anniversary["kind"],
    repeat_yearly: !!r.repeat_yearly,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted: !!r.deleted,
  };
}

export async function listAnniversaries(): Promise<Anniversary[]> {
  const db = await getDb();
  const rows = await db.select<RawRow[]>(
    "SELECT * FROM anniversaries WHERE deleted=0 ORDER BY date ASC"
  );
  return rows.map(mapRow);
}

export async function addAnniversary(input: {
  name: string;
  date: string;
  kind: Anniversary["kind"];
  repeat_yearly: boolean;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = nowISO();
  await db.execute(
    "INSERT INTO anniversaries (id, name, date, kind, repeat_yearly, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    [id, input.name, input.date, input.kind, input.repeat_yearly ? 1 : 0, ts, ts]
  );
  return id;
}

export async function deleteAnniversary(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE anniversaries SET deleted=1, updated_at=? WHERE id=?",
    [nowISO(), id]
  );
}
