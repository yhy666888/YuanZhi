from collections.abc import Callable

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


MIGRATIONS: list[tuple[int, Callable[[Engine], None]]] = [
    (1, add_missing_plan_columns),
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
