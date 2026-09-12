from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Engine, inspect, text


def add_missing_plan_columns(engine: Engine):
    inspector = inspect(engine)
    if "plans" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("plans")}
    columns = {
        "start_time": "VARCHAR(5)",
        "end_time": "VARCHAR(5)",
        "priority": "VARCHAR(10) NOT NULL DEFAULT 'medium'",
        "notes": "TEXT NOT NULL DEFAULT ''",
        "progress": "INTEGER NOT NULL DEFAULT 0",
        "created_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, definition in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE plans ADD COLUMN {name} {definition}"))


def shift_todo_created_at_to_local_time(engine: Engine):
    """v2 之前 Todo.created_at 以 UTC 存储，统一改为本地时间。"""
    inspector = inspect(engine)
    if "todos" not in inspector.get_table_names():
        return
    offset_seconds = int((datetime.now() - datetime.utcnow()).total_seconds())
    if offset_seconds == 0:
        return
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE todos SET created_at = datetime(created_at, :delta)"),
            {"delta": f"{offset_seconds:+d} seconds"},
        )


def assign_plan_repeat_groups(engine: Engine):
    """v3 为计划引入重复系列标识，历史数据中内容一致的每日计划归入同一系列。"""
    inspector = inspect(engine)
    if "plans" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("plans")}
    with engine.begin() as connection:
        if "repeat_group_id" not in columns:
            connection.execute(text("ALTER TABLE plans ADD COLUMN repeat_group_id VARCHAR(36)"))
        rows = connection.execute(
            text("SELECT id, plan_type, title, start_time, end_time, priority FROM plans WHERE repeat_group_id IS NULL")
        ).mappings().fetchall()
        series: dict[tuple, list[int]] = {}
        for row in rows:
            if row["plan_type"] == "daily":
                key = (row["title"], row["start_time"], row["end_time"], row["priority"])
                series.setdefault(key, []).append(row["id"])
        shared = {key: uuid4().hex for key, ids in series.items() if len(ids) >= 2}
        for row in rows:
            key = (row["title"], row["start_time"], row["end_time"], row["priority"])
            group_id = shared.get(key) or uuid4().hex
            connection.execute(
                text("UPDATE plans SET repeat_group_id = :group_id WHERE id = :id"),
                {"group_id": group_id, "id": row["id"]},
            )


MIGRATIONS: list[tuple[int, Callable[[Engine], None]]] = [
    (1, add_missing_plan_columns),
    (2, shift_todo_created_at_to_local_time),
    (3, assign_plan_repeat_groups),
]


def run_migrations(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)"))
        applied = {row[0] for row in connection.execute(text("SELECT version FROM schema_migrations"))}
    for version, migration in MIGRATIONS:
        if version in applied:
            continue
        migration(engine)
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES (:version)"), {"version": version})
