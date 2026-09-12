from collections.abc import Callable
from datetime import datetime

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


MIGRATIONS: list[tuple[int, Callable[[Engine], None]]] = [
    (1, add_missing_plan_columns),
    (2, shift_todo_created_at_to_local_time),
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
