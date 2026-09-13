from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PomodoroSession, Todo
from ..schemas import PomodoroComplete, PomodoroRead, PomodoroUpdate, TodoRead

router = APIRouter(prefix="/api", tags=["pomodoros"])


@router.post("/pomodoros", response_model=TodoRead | None)
def complete_pomodoro(payload: PomodoroComplete, db: Session = Depends(get_db)):
    todo = db.get(Todo, payload.todo_id) if payload.todo_id else None
    if payload.todo_id and not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    session_values = payload.model_dump(exclude_none=True)
    db.add(PomodoroSession(**session_values))
    if todo:
        todo.pomodoros += 1
    db.commit()
    if todo:
        db.refresh(todo)
    return todo


@router.get("/pomodoros", response_model=list[PomodoroRead])
def list_pomodoros(days: int = Query(default=7, ge=1, le=366), db: Session = Depends(get_db)):
    """返回最近 N 天的专注记录（按完成时间倒序）。"""
    since = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    return db.scalars(
        select(PomodoroSession)
        .where(PomodoroSession.completed_at >= since)
        .order_by(PomodoroSession.completed_at.desc(), PomodoroSession.id.desc())
        .limit(200)
    ).all()


@router.patch("/pomodoros/{session_id}", response_model=PomodoroRead)
def update_pomodoro(session_id: int, payload: PomodoroUpdate, db: Session = Depends(get_db)):
    session = db.get(PomodoroSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="专注记录不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/pomodoros/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pomodoro(session_id: int, db: Session = Depends(get_db)):
    session = db.get(PomodoroSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="专注记录不存在")
    db.delete(session)
    db.commit()
