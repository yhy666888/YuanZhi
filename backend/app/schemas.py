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


class PomodoroRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    todo_id: int | None
    duration_seconds: int
    completed_at: datetime


class PomodoroUpdate(BaseModel):
    duration_seconds: int | None = Field(default=None, ge=1, le=10800)
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
    repeat_group_id: str | None = None
    created_at: datetime


class PlanDayStat(BaseModel):
    date: date
    total: int
    completed: int


class PlanOverdueItem(BaseModel):
    id: int
    title: str
    start_date: date
    start_time: str | None = None
    priority: str


class PlanStats(BaseModel):
    today_total: int = 0
    today_completed: int = 0
    week_total: int = 0
    week_completed: int = 0
    week_rate: int = 0
    last7_total: int = 0
    last7_completed: int = 0
    last30_total: int = 0
    last30_completed: int = 0
    streak_days: int = 0
    heatmap: list[PlanDayStat] = Field(default_factory=list)
    overdue: list[PlanOverdueItem] = Field(default_factory=list)


class PlanCheckins(BaseModel):
    period: str
    days: list[PlanDayStat] = Field(default_factory=list)


class PlanTemplateItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    start_time: str | None
    end_time: str | None
    priority: str
    notes: str
    sort_order: int


class PlanTemplateRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    items: list[PlanTemplateItemRead] = Field(default_factory=list)


class PlanTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    date: date


class PlanTemplateApply(BaseModel):
    date: date


class ExpenseCreate(BaseModel):
    kind: str = Field(default="expense", pattern="^(expense|income)$")
    amount_cents: int = Field(ge=1, le=10_000_000)
    category: str = Field(min_length=1, max_length=20)
    method: str = Field(default="微信", max_length=20)
    note: str = Field(default="", max_length=200)
    spent_at: datetime


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    amount_cents: int
    category: str
    method: str
    note: str
    spent_at: datetime
    created_at: datetime


class ExpenseUpdate(BaseModel):
    kind: str | None = Field(default=None, pattern="^(expense|income)$")
    amount_cents: int | None = Field(default=None, ge=1, le=10_000_000)
    category: str | None = Field(default=None, min_length=1, max_length=20)
    method: str | None = Field(default=None, max_length=20)
    note: str | None = Field(default=None, max_length=200)
    spent_at: datetime | None = None


class ExpenseCategoryTotal(BaseModel):
    category: str
    total_cents: int
    count: int


class ExpenseSummary(BaseModel):
    month_total_cents: int = 0
    month_income_cents: int = 0
    today_total_cents: int = 0
    count: int = 0
    by_category: list[ExpenseCategoryTotal] = Field(default_factory=list)
    savings_cents: int = 0
    debt_cents: int = 0


class ExpenseList(BaseModel):
    items: list[ExpenseRead] = Field(default_factory=list)
    summary: ExpenseSummary = Field(default_factory=ExpenseSummary)


class TodoImport(BaseModel):
    id: int
    title: str
    priority: str = "low"
    due_at: datetime | None = None
    completed: bool = False
    pomodoros: int = 0
    pomodoro_target: int = 0
    created_at: datetime | None = None


class PlanImport(BaseModel):
    id: int
    plan_type: str = Field(pattern="^(daily|monthly|yearly)$")
    title: str
    start_date: date
    end_date: date
    start_time: str | None = None
    end_time: str | None = None
    priority: str = "medium"
    notes: str = ""
    progress: int = Field(default=0, ge=0, le=100)
    repeat_group_id: str | None = None
    created_at: datetime | None = None


class PomodoroImport(BaseModel):
    id: int
    todo_id: int | None = None
    duration_seconds: int = 1500
    completed_at: datetime | None = None


class ExpenseImport(BaseModel):
    id: int
    kind: str = "expense"
    amount_cents: int = Field(ge=1)
    category: str
    method: str = "微信"
    note: str = ""
    spent_at: datetime
    created_at: datetime | None = None


class PlanTemplateItemImport(BaseModel):
    id: int
    title: str
    start_time: str | None = None
    end_time: str | None = None
    priority: str = "medium"
    notes: str = ""
    sort_order: int = 0


class PlanTemplateImport(BaseModel):
    id: int
    name: str
    items: list[PlanTemplateItemImport] = Field(default_factory=list)
    created_at: datetime | None = None


class DataImport(BaseModel):
    todos: list[TodoImport] = Field(default_factory=list)
    plans: list[PlanImport] = Field(default_factory=list)
    pomodoros: list[PomodoroImport] = Field(default_factory=list)
    plan_templates: list[PlanTemplateImport] = Field(default_factory=list)
    expenses: list[ExpenseImport] = Field(default_factory=list)
    settings: dict[str, str] = Field(default_factory=dict)
