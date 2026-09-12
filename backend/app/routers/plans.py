from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan
from ..schemas import PlanCreate, PlanRead, PlanUpdate

router = APIRouter(prefix="/api", tags=["plans"])


@router.get("/plans", response_model=list[PlanRead])
def list_plans(plan_type: str | None = None, db: Session = Depends(get_db)):
    query = select(Plan)
    if plan_type:
        query = query.where(Plan.plan_type == plan_type)
    return db.scalars(query.order_by(Plan.start_date, Plan.start_time, Plan.id.desc())).all()


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
    plans = [Plan(**{**values, "start_date": value, "end_date": value}) for value in dates]
    db.add_all(plans)
    db.commit()
    db.refresh(plans[0])
    return plans[0]


@router.patch("/plans/{plan_id}", response_model=PlanRead)
def update_plan(plan_id: int, payload: PlanUpdate, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
