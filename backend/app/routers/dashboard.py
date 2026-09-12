from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PomodoroSession, Todo
from ..schemas import DashboardRead

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardRead)
def dashboard(db: Session = Depends(get_db)):
    start = datetime.combine(date.today(), time.min)
    end = start + timedelta(days=1)
    today_todos = (Todo.due_at >= start, Todo.due_at < end)
    today_sessions = (PomodoroSession.completed_at >= start, PomodoroSession.completed_at < end)
    total = db.scalar(select(func.count()).select_from(Todo).where(*today_todos)) or 0
    completed = db.scalar(select(func.count()).select_from(Todo).where(Todo.completed.is_(True), *today_todos)) or 0
    focus = db.scalar(select(func.coalesce(func.sum(PomodoroSession.duration_seconds), 0)).where(*today_sessions)) or 0
    pomodoros = db.scalar(select(func.count()).select_from(PomodoroSession).where(*today_sessions)) or 0
    return DashboardRead(total_todos=total, completed_todos=completed, focus_minutes_today=focus // 60, pomodoros_today=pomodoros)
