export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    due_at TEXT,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    tag TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS memos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    content_md TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'rich',
    color TEXT NOT NULL DEFAULT 'yellow',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS account_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    color TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id TEXT,
    note TEXT,
    occurred_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    plan_type TEXT NOT NULL DEFAULT 'daily',
    title TEXT NOT NULL,
    notes TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    time_type TEXT NOT NULL DEFAULT 'point',
    date TEXT NOT NULL DEFAULT '',
    start_at TEXT,
    end_at TEXT,
    color TEXT,
    repeat TEXT NOT NULL DEFAULT 'none',
    repeat_interval INTEGER NOT NULL DEFAULT 1,
    progress INTEGER NOT NULL DEFAULT 0,
    progress_note TEXT,
    target_period TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS plan_date_ranges (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plan_checkins (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(plan_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_min INTEGER NOT NULL,
    task TEXT,
    tag TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS anniversaries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    kind TEXT NOT NULL,
    repeat_yearly INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    last_sync_at TEXT,
    remote_cursor TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_at) WHERE deleted=0`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_occurred ON accounts(occurred_on) WHERE deleted=0`,
  `CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date) WHERE deleted=0`,
  `CREATE INDEX IF NOT EXISTS idx_pomodoro_started ON pomodoro_sessions(started_at)`,
];

/** 增量迁移：对已存在的表补充新字段（列已存在时忽略错误） */
export const MIGRATION_STATEMENTS: string[] = [
  "ALTER TABLE todos ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE todos ADD COLUMN tag TEXT",
  "ALTER TABLE memos ADD COLUMN content_md TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE memos ADD COLUMN format TEXT NOT NULL DEFAULT 'rich'",
  "ALTER TABLE memos ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow'",
  "ALTER TABLE plans ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'daily'",
  "ALTER TABLE plans ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'",
  "ALTER TABLE plans ADD COLUMN repeat_interval INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE plans ADD COLUMN progress INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE plans ADD COLUMN progress_note TEXT",
  "ALTER TABLE plans ADD COLUMN target_period TEXT",
  "ALTER TABLE plans ADD COLUMN notes TEXT",
  "ALTER TABLE plans ADD COLUMN priority INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE plans ADD COLUMN time_type TEXT NOT NULL DEFAULT 'point'",
];
