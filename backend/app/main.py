import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine
from .migrations import run_migrations
from .models import Todo
from .routers import dashboard, data, plans, pomodoros, settings, todos, trending, weather

BACKUP_KEEP = 7


def backup_database():
    """每次启动前把 SQLite 数据库复制到 backups/，只保留最近 BACKUP_KEEP 份。"""
    url = engine.url
    if not url.drivername.startswith("sqlite") or not url.database or url.database == ":memory:":
        return
    database = Path(url.database)
    if not database.exists():
        return
    backup_dir = database.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(database, backup_dir / f"yuanzhi-{datetime.now():%Y%m%d-%H%M%S}.db")
    for stale in sorted(backup_dir.glob("yuanzhi-*.db"))[:-BACKUP_KEEP]:
        stale.unlink()


def create_tables():
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    with Session(bind=engine) as db:
        if (db.scalar(select(func.count()).select_from(Todo)) or 0) == 0:
            today = datetime.now().replace(second=0, microsecond=0)
            db.add_all([
                Todo(title="完成产品需求文档", priority="high", due_at=today.replace(hour=18, minute=0), pomodoros=4, pomodoro_target=8),
                Todo(title="准备周会演示 PPT", priority="high", due_at=today.replace(hour=14, minute=0), pomodoro_target=3),
                Todo(title="审阅设计稿并给出反馈", priority="medium", due_at=today.replace(hour=17, minute=0), pomodoro_target=2),
                Todo(title="整理用户反馈数据", priority="medium", due_at=today.replace(hour=23, minute=59), pomodoro_target=4),
                Todo(title="更新项目文档", priority="low", due_at=today + timedelta(days=1), pomodoro_target=2),
            ])
            db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    backup_database()
    create_tables()
    yield


app = FastAPI(title="YuanZhi API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])
app.include_router(todos.router)
app.include_router(pomodoros.router)
app.include_router(dashboard.router)
app.include_router(plans.router)
app.include_router(weather.router)
app.include_router(trending.router)
app.include_router(settings.router)
app.include_router(data.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# 生产模式：frontend/dist 存在时由 FastAPI 直接托管前端（应用使用 hash 路由，无需 SPA 回退）
DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
