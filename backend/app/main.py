from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine
from .migrations import run_migrations
from .models import Todo
from .routers import dashboard, plans, pomodoros, settings, todos, trending, weather


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


@app.get("/api/health")
def health():
    return {"status": "ok"}
