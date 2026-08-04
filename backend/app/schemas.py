from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    priority: str = Field(default="low", pattern="^(high|medium|low)$")
    due_at: datetime | None = None
    pomodoro_target: int = Field(default=0, ge=0, le=20)


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    priority: str | None = Field(default=None, pattern="^(high|medium|low)$")
    due_at: datetime | None = None
    completed: bool | None = None
    pomodoro_target: int | None = Field(default=None, ge=0, le=20)


class TodoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    priority: str
    due_at: datetime | None
    completed: bool
    pomodoros: int
    pomodoro_target: int
    created_at: datetime


class PomodoroComplete(BaseModel):
    todo_id: int | None = None
    duration_seconds: int = Field(default=1500, ge=1, le=10800)
    completed_at: datetime | None = None


class DashboardRead(BaseModel):
    total_todos: int
    completed_todos: int
    focus_minutes_today: int
    pomodoros_today: int


class SettingsRead(BaseModel):
    weather_api_url: str = ""
    weather_api_key: str = ""
    weather_city: str = ""
    search_api_url: str = ""
    search_api_key: str = ""


class SettingsUpdate(SettingsRead):
    pass


class PlanCreate(BaseModel):
    plan_type: str = Field(pattern="^(daily|monthly|yearly)$")
    title: str = Field(min_length=1, max_length=160)
    start_date: date
    end_date: date
    start_time: str | None = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    end_time: str | None = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    priority: str = Field(default="medium", pattern="^(high|medium|low)$")
    notes: str = Field(default="", max_length=1000)
    progress: int = Field(default=0, ge=0, le=100)
    repeat_type: str = Field(default="none", pattern="^(none|daily|interval|weekly)$", exclude=True)
    repeat_interval: int = Field(default=1, ge=1, le=365, exclude=True)
    repeat_weekdays: list[int] = Field(default_factory=list, exclude=True)


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    start_time: str | None = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    end_time: str | None = Field(default=None, pattern="^([01]\\d|2[0-3]):[0-5]\\d$")
    priority: str | None = Field(default=None, pattern="^(high|medium|low)$")
    notes: str | None = Field(default=None, max_length=1000)
    progress: int | None = Field(default=None, ge=0, le=100)


class PlanRead(PlanCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
