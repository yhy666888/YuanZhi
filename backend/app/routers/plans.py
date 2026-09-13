from datetime import date, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan
from ..schemas import (
    PlanCheckins,
    PlanCreate,
    PlanDayStat,
    PlanOverdueItem,
    PlanRead,
    PlanStats,
    PlanUpdate,
)

router = APIRouter(prefix="/api", tags=["plans"])

HEATMAP_DAYS = 105
OVERDUE_WINDOW_DAYS = 14
OVERDUE_LIMIT = 30
# 系列修改只影响内容字段；各天的日期与完成状态保持独立
SERIES_CONTENT_FIELDS = {"title", "start_time", "end_time", "priority", "notes"}


@router.get("/plans", response_model=list[PlanRead])
def list_plans(plan_type: str | None = None, db: Session = Depends(get_db)):
    query = select(Plan)
    if plan_type:
        query = query.where(Plan.plan_type == plan_type)
    return db.scalars(query.order_by(Plan.start_date, Plan.start_time, Plan.id.desc())).all()


@router.get("/plans/stats", response_model=PlanStats)
def plan_stats(db: Session = Depends(get_db)):
    today = date.today()
    window_start = today - timedelta(days=HEATMAP_DAYS - 1)
    rows = db.scalars(
        select(Plan).where(
            Plan.plan_type == "daily",
            Plan.start_date >= window_start,
            Plan.start_date <= today,
        )
    ).all()
    by_date: dict[date, list[Plan]] = {}
    for plan in rows:
        by_date.setdefault(plan.start_date, []).append(plan)

    def day_stat(day: date) -> tuple[int, int]:
        entries = by_date.get(day, [])
        return len(entries), sum(1 for entry in entries if entry.progress >= 100)

    heatmap = []
    for offset in range(HEATMAP_DAYS):
        day = window_start + timedelta(days=offset)
        total, completed = day_stat(day)
        heatmap.append(PlanDayStat(date=day, total=total, completed=completed))

    today_total, today_completed = day_stat(today)

    week_start = today - timedelta(days=today.weekday())
    week_total = week_completed = 0
    for offset in range((today - week_start).days + 1):
        total, completed = day_stat(week_start + timedelta(days=offset))
        week_total += total
        week_completed += completed

    # 近 7 天 / 近 30 天（含今天）完成情况，供首页概览展示
    last7_total = last7_completed = last30_total = last30_completed = 0
    for offset in range(30):
        total, completed = day_stat(today - timedelta(days=offset))
        if offset < 7:
            last7_total += total
            last7_completed += completed
        last30_total += total
        last30_completed += completed

    # 连续全勤：从今天往回数“全部完成”的天数；没有计划的日子不断档；今天未完成不影响已保持的纪录
    streak_days = 0
    day = today
    while day >= window_start:
        total, completed = day_stat(day)
        if total > 0:
            if completed < total and day != today:
                break
            if completed == total:
                streak_days += 1
        day -= timedelta(days=1)

    overdue_rows = db.scalars(
        select(Plan)
        .where(
            Plan.plan_type == "daily",
            Plan.progress < 100,
            Plan.start_date < today,
            Plan.start_date >= today - timedelta(days=OVERDUE_WINDOW_DAYS - 1),
        )
        .order_by(Plan.start_date.desc(), Plan.start_time.desc(), Plan.id.desc())
        .limit(OVERDUE_LIMIT)
    ).all()

    return PlanStats(
        today_total=today_total,
        today_completed=today_completed,
        week_total=week_total,
        week_completed=week_completed,
        week_rate=round(week_completed / week_total * 100) if week_total else 0,
        last7_total=last7_total,
        last7_completed=last7_completed,
        last30_total=last30_total,
        last30_completed=last30_completed,
        streak_days=streak_days,
        heatmap=heatmap,
        overdue=[
            PlanOverdueItem(
                id=plan.id,
                title=plan.title,
                start_date=plan.start_date,
                start_time=plan.start_time,
                priority=plan.priority,
            )
            for plan in overdue_rows
        ],
    )


@router.get("/plans/checkins", response_model=PlanCheckins)
def plan_checkins(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    year: int | None = Query(default=None, ge=2000, le=2999),
    db: Session = Depends(get_db),
):
    """按月或按年返回每日计划打卡情况；不传参数时为当月，不能查看未来期间。"""
    today = date.today()
    if year:
        if year > today.year:
            raise HTTPException(status_code=422, detail="不能查看未来年份的打卡")
        period_start = date(year, 1, 1)
        period_end = date(year, 12, 31)
        period_key = str(year)
    elif month:
        year_num, mon = (int(part) for part in month.split("-"))
        if (year_num, mon) > (today.year, today.month):
            raise HTTPException(status_code=422, detail="不能查看未来月份的打卡")
        period_start = date(year_num, mon, 1)
        next_month = date(year_num + 1, 1, 1) if mon == 12 else date(year_num, mon + 1, 1)
        period_end = next_month - timedelta(days=1)
        period_key = f"{year_num:04d}-{mon:02d}"
    else:
        period_start = date(today.year, today.month, 1)
        next_month = date(today.year + 1, 1, 1) if today.month == 12 else date(today.year, today.month + 1, 1)
        period_end = next_month - timedelta(days=1)
        period_key = f"{today.year:04d}-{today.month:02d}"
    rows = db.scalars(
        select(Plan).where(
            Plan.plan_type == "daily",
            Plan.start_date >= period_start,
            Plan.start_date <= period_end,
        )
    ).all()
    by_date: dict[date, list[Plan]] = {}
    for plan in rows:
        by_date.setdefault(plan.start_date, []).append(plan)
    days_total = (period_end - period_start).days + 1
    days = []
    for offset in range(days_total):
        day = period_start + timedelta(days=offset)
        entries = by_date.get(day, [])
        days.append(PlanDayStat(date=day, total=len(entries), completed=sum(1 for entry in entries if entry.progress >= 100)))
    return PlanCheckins(period=period_key, days=days)


@router.post("/plans", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db)):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="结束日期不能早于开始日期")
    if payload.plan_type == "daily" and not payload.start_time:
        raise HTTPException(status_code=422, detail="每日计划需要填写开始时间")
    if payload.start_date == payload.end_date and payload.start_time and payload.end_time and payload.end_time < payload.start_time:
        raise HTTPException(status_code=422, detail="结束时间不能早于开始时间")
    if payload.repeat_type != "none" and payload.plan_type != "daily":
        raise HTTPException(status_code=422, detail="重复功能仅适用于每日计划")
    if payload.repeat_type == "weekly" and not payload.repeat_weekdays:
        raise HTTPException(status_code=422, detail="每周重复至少选择一个星期")
    if any(day < 0 or day > 6 for day in payload.repeat_weekdays):
        raise HTTPException(status_code=422, detail="星期必须在 0 到 6 之间")

    values = payload.model_dump(exclude={"repeat_type", "repeat_interval", "repeat_weekdays"})
    dates = [payload.start_date]
    if payload.repeat_type != "none":
        span = (payload.end_date - payload.start_date).days
        if span > 1095:
            raise HTTPException(status_code=422, detail="重复计划的日期范围不能超过三年")
        candidates = (payload.start_date + timedelta(days=offset) for offset in range(span + 1))
        if payload.repeat_type == "daily":
            dates = list(candidates)
        elif payload.repeat_type == "interval":
            dates = [value for value in candidates if (value - payload.start_date).days % payload.repeat_interval == 0]
        else:
            dates = [value for value in candidates if value.weekday() in payload.repeat_weekdays]
    group_id = uuid4().hex
    plans = [Plan(**{**values, "start_date": value, "end_date": value, "repeat_group_id": group_id}) for value in dates]
    db.add_all(plans)
    db.commit()
    db.refresh(plans[0])
    return plans[0]


def _series_targets(db: Session, plan: Plan, scope: str) -> list[Plan]:
    if scope == "one" or not plan.repeat_group_id:
        return [plan]
    query = select(Plan).where(Plan.repeat_group_id == plan.repeat_group_id)
    if scope == "following":
        query = query.where(Plan.start_date >= plan.start_date)
    return list(db.scalars(query.order_by(Plan.start_date)).all())


@router.patch("/plans/{plan_id}", response_model=PlanRead)
def update_plan(
    plan_id: int,
    payload: PlanUpdate,
    scope: str = Query(default="one", pattern="^(one|series|following)$"),
    db: Session = Depends(get_db),
):
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    changes = payload.model_dump(exclude_unset=True)
    start_date = changes.get("start_date", plan.start_date)
    end_date = changes.get("end_date", plan.end_date)
    start_time = changes.get("start_time", plan.start_time)
    end_time = changes.get("end_time", plan.end_time)
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="结束日期不能早于开始日期")
    if plan.plan_type == "daily" and not start_time:
        raise HTTPException(status_code=422, detail="每日计划需要填写开始时间")
    if start_date == end_date and start_time and end_time and end_time < start_time:
        raise HTTPException(status_code=422, detail="结束时间不能早于开始时间")
    for field, value in changes.items():
        setattr(plan, field, value)
    if scope != "one":
        for target in _series_targets(db, plan, scope):
            if target.id == plan.id:
                continue
            for field in SERIES_CONTENT_FIELDS:
                if field in changes:
                    setattr(target, field, changes[field])
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    scope: str = Query(default="one", pattern="^(one|series|following)$"),
    db: Session = Depends(get_db),
):
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for target in _series_targets(db, plan, scope):
        db.delete(target)
    db.commit()
