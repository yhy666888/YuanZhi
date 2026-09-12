from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    priority: Mapped[str] = mapped_column(String(10), default="low")
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    pomodoros: Mapped[int] = mapped_column(Integer, default=0)
    pomodoro_target: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    todo_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=1500)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(500), default="")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_type: Mapped[str] = mapped_column(String(12))
    title: Mapped[str] = mapped_column(String(160))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    notes: Mapped[str] = mapped_column(Text, default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    repeat_group_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
