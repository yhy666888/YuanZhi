from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PomodoroSession, Todo
from ..schemas import PomodoroComplete, TodoRead

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
