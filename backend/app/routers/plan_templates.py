from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan, PlanTemplate, PlanTemplateItem
from ..schemas import PlanTemplateApply, PlanTemplateCreate, PlanTemplateRead

router = APIRouter(prefix="/api", tags=["plan-templates"])


def _template_payload(template: PlanTemplate, items: list[PlanTemplateItem]) -> dict:
    return {
        "id": template.id,
        "name": template.name,
        "created_at": template.created_at,
        "items": [
            {
                "id": item.id, "title": item.title, "start_time": item.start_time,
                "end_time": item.end_time, "priority": item.priority,
                "notes": item.notes, "sort_order": item.sort_order,
            }
            for item in items
        ],
    }


def _load_templates(db: Session) -> list[tuple[PlanTemplate, list[PlanTemplateItem]]]:
    templates = db.scalars(select(PlanTemplate).order_by(PlanTemplate.created_at.desc(), PlanTemplate.id.desc())).all()
    items = db.scalars(select(PlanTemplateItem).order_by(PlanTemplateItem.sort_order, PlanTemplateItem.id)).all()
    grouped: dict[int, list[PlanTemplateItem]] = {}
    for item in items:
        grouped.setdefault(item.template_id, []).append(item)
    return [(template, grouped.get(template.id, [])) for template in templates]


@router.get("/plan-templates", response_model=list[PlanTemplateRead])
def list_templates(db: Session = Depends(get_db)):
    return [_template_payload(template, items) for template, items in _load_templates(db)]


@router.post("/plan-templates", response_model=PlanTemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(payload: PlanTemplateCreate, db: Session = Depends(get_db)):
    """把指定日期已有的每日计划保存为一个模板。"""
    day_plans = db.scalars(
        select(Plan)
        .where(Plan.plan_type == "daily", Plan.start_date == payload.date)
        .order_by(Plan.start_time.is_(None), Plan.start_time, Plan.id)
    ).all()
    if not day_plans:
        raise HTTPException(status_code=422, detail="该日期没有每日计划，无法保存为模板")
    template = PlanTemplate(name=payload.name.strip())
    db.add(template)
    db.flush()
    for order, plan in enumerate(day_plans):
        db.add(PlanTemplateItem(
            template_id=template.id, title=plan.title,
            start_time=plan.start_time, end_time=plan.end_time,
            priority=plan.priority, notes=plan.notes, sort_order=order,
        ))
    db.commit()
    db.refresh(template)
    items = db.scalars(select(PlanTemplateItem).where(PlanTemplateItem.template_id == template.id).order_by(PlanTemplateItem.sort_order, PlanTemplateItem.id)).all()
    return _template_payload(template, list(items))


@router.delete("/plan-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.get(PlanTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    for item in db.scalars(select(PlanTemplateItem).where(PlanTemplateItem.template_id == template_id)).all():
        db.delete(item)
    db.delete(template)
    db.commit()


@router.post("/plan-templates/{template_id}/apply")
def apply_template(template_id: int, payload: PlanTemplateApply, db: Session = Depends(get_db)):
    """把模板内容生成为指定日期的每日计划，自动跳过当天已有的同名同时间计划。"""
    template = db.get(PlanTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    items = db.scalars(select(PlanTemplateItem).where(PlanTemplateItem.template_id == template_id).order_by(PlanTemplateItem.sort_order, PlanTemplateItem.id)).all()
    if not items:
        raise HTTPException(status_code=422, detail="模板内容为空")
    existing_keys = {
        (plan.title, plan.start_time)
        for plan in db.scalars(select(Plan).where(Plan.plan_type == "daily", Plan.start_date == payload.date)).all()
    }
    created = 0
    for item in items:
        if (item.title, item.start_time) in existing_keys:
            continue
        db.add(Plan(
            plan_type="daily", title=item.title,
            start_date=payload.date, end_date=payload.date,
            start_time=item.start_time, end_time=item.end_time,
            priority=item.priority, notes=item.notes,
            progress=0, repeat_group_id=uuid4().hex,
        ))
        created += 1
    db.commit()
    return {"created": created, "date": payload.date.isoformat(), "total": len(items)}
