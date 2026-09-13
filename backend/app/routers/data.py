from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting, Expense, Plan, PlanTemplate, PlanTemplateItem, PomodoroSession, Todo
from ..schemas import DataImport
from .settings import SETTING_KEYS

router = APIRouter(prefix="/api", tags=["data"])

EXPORT_FILENAME = "yuanzhi-backup.json"


@router.get("/export")
def export_data(db: Session = Depends(get_db)):
    """导出全部业务数据；设置里的 API Key 一并导出，请妥善保管备份文件。"""
    settings = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    payload = {
        "app": "yuanzhi",
        "version": 1,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "todos": [
            {
                "id": todo.id, "title": todo.title, "priority": todo.priority,
                "due_at": todo.due_at, "completed": todo.completed,
                "pomodoros": todo.pomodoros, "pomodoro_target": todo.pomodoro_target,
                "created_at": todo.created_at,
            }
            for todo in db.scalars(select(Todo)).all()
        ],
        "plans": [
            {
                "id": plan.id, "plan_type": plan.plan_type, "title": plan.title,
                "start_date": plan.start_date, "end_date": plan.end_date,
                "start_time": plan.start_time, "end_time": plan.end_time,
                "priority": plan.priority, "notes": plan.notes, "progress": plan.progress,
                "repeat_group_id": plan.repeat_group_id, "created_at": plan.created_at,
            }
            for plan in db.scalars(select(Plan)).all()
        ],
        "pomodoros": [
            {
                "id": session.id, "todo_id": session.todo_id,
                "duration_seconds": session.duration_seconds, "completed_at": session.completed_at,
            }
            for session in db.scalars(select(PomodoroSession)).all()
        ],
        "expenses": [
            {
                "id": expense.id, "kind": expense.kind, "amount_cents": expense.amount_cents,
                "category": expense.category, "method": expense.method,
                "note": expense.note, "spent_at": expense.spent_at, "created_at": expense.created_at,
            }
            for expense in db.scalars(select(Expense)).all()
        ],
        "plan_templates": [
            {
                "id": template.id, "name": template.name, "created_at": template.created_at,
                "items": [
                    {
                        "id": item.id, "title": item.title, "start_time": item.start_time,
                        "end_time": item.end_time, "priority": item.priority,
                        "notes": item.notes, "sort_order": item.sort_order,
                    }
                    for item in db.scalars(
                        select(PlanTemplateItem).where(PlanTemplateItem.template_id == template.id)
                    ).all()
                ],
            }
            for template in db.scalars(select(PlanTemplate)).all()
        ],
        "settings": {key: settings.get(key, "") for key in SETTING_KEYS},
    }
    return JSONResponse(
        content=jsonable_encoder(payload),
        headers={"Content-Disposition": f'attachment; filename="{EXPORT_FILENAME}"'},
    )


@router.post("/import")
def import_data(payload: DataImport, db: Session = Depends(get_db)):
    """用备份文件整体替换当前数据（待办、计划、专注记录、模板、记账与设置）。"""
    now = datetime.now()
    for model in (PlanTemplateItem, PlanTemplate, Expense, Todo, Plan, PomodoroSession):
        db.query(model).delete()
    db.add_all([
        Todo(
            id=item.id, title=item.title, priority=item.priority, due_at=item.due_at,
            completed=item.completed, pomodoros=item.pomodoros,
            pomodoro_target=item.pomodoro_target, created_at=item.created_at or now,
        )
        for item in payload.todos
    ])
    db.add_all([
        Plan(
            id=item.id, plan_type=item.plan_type, title=item.title,
            start_date=item.start_date, end_date=item.end_date,
            start_time=item.start_time, end_time=item.end_time,
            priority=item.priority, notes=item.notes, progress=item.progress,
            repeat_group_id=item.repeat_group_id, created_at=item.created_at or now,
        )
        for item in payload.plans
    ])
    db.add_all([
        PomodoroSession(
            id=item.id, todo_id=item.todo_id,
            duration_seconds=item.duration_seconds,
            completed_at=item.completed_at or now,
        )
        for item in payload.pomodoros
    ])
    db.add_all([
        Expense(
            id=item.id, kind=item.kind, amount_cents=item.amount_cents, category=item.category,
            method=item.method, note=item.note, spent_at=item.spent_at, created_at=item.created_at or now,
        )
        for item in payload.expenses
    ])
    for template in payload.plan_templates:
        db.add(PlanTemplate(id=template.id, name=template.name, created_at=template.created_at or now))
        db.add_all([
            PlanTemplateItem(
                id=item.id, template_id=template.id, title=item.title,
                start_time=item.start_time, end_time=item.end_time,
                priority=item.priority, notes=item.notes, sort_order=item.sort_order,
            )
            for item in template.items
        ])
    for key in SETTING_KEYS:
        if key in payload.settings:
            setting = db.get(AppSetting, key)
            if setting:
                setting.value = payload.settings[key]
            else:
                db.add(AppSetting(key=key, value=payload.settings[key]))
    db.commit()
    return {
        "todos": len(payload.todos),
        "plans": len(payload.plans),
        "pomodoros": len(payload.pomodoros),
        "expenses": len(payload.expenses),
        "plan_templates": len(payload.plan_templates),
    }
