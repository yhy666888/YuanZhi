from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Expense
from ..schemas import ExpenseCategoryTotal, ExpenseCreate, ExpenseList, ExpenseRead, ExpenseSummary, ExpenseUpdate

router = APIRouter(prefix="/api", tags=["expenses"])

# 信用卡视为负债账户：其支出累计为待还负债，其收入（还款）冲减负债
CREDIT_METHOD = "信用卡"


def _parse_month(month: str) -> tuple[date, date]:
    try:
        month_start = date.fromisoformat(f"{month}-01")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="月份格式应为 YYYY-MM") from exc
    if month_start.month == 12:
        next_year, next_month = month_start.year + 1, 1
    else:
        next_year, next_month = month_start.year, month_start.month + 1
    month_end = date(next_year, next_month, 1) - timedelta(days=1)
    return month_start, month_end


@router.get("/expenses", response_model=ExpenseList)
def list_expenses(month: str | None = None, db: Session = Depends(get_db)):
    month_key = (month or date.today().strftime("%Y-%m")).strip()
    month_start, month_end = _parse_month(month_key)
    range_start = datetime.combine(month_start, time.min)
    range_end = datetime.combine(month_end, time.max)
    items = db.scalars(
        select(Expense)
        .where(Expense.spent_at >= range_start, Expense.spent_at <= range_end)
        .order_by(Expense.spent_at.desc(), Expense.id.desc())
    ).all()
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = today_start + timedelta(days=1)
    today_rows = db.scalars(select(Expense).where(Expense.spent_at >= today_start, Expense.spent_at < today_end)).all()

    by_category: dict[str, list[int]] = {}
    month_total = 0
    month_income = 0
    for item in items:
        if item.kind == "income":
            month_income += item.amount_cents
        else:
            month_total += item.amount_cents
            by_category.setdefault(item.category, []).append(item.amount_cents)

    # 存款 = 非信用卡收入 − 非信用卡支出；负债 = 信用卡支出 − 信用卡还款
    all_rows = db.scalars(select(Expense)).all()
    savings = 0
    debt = 0
    for row in all_rows:
        credit = row.method == CREDIT_METHOD
        signed = row.amount_cents if row.kind == "income" else -row.amount_cents
        if credit:
            debt -= signed
        else:
            savings += signed

    summary = ExpenseSummary(
        month_total_cents=month_total,
        month_income_cents=month_income,
        today_total_cents=sum(row.amount_cents for row in today_rows if row.kind == "expense"),
        count=sum(1 for item in items if item.kind == "expense"),
        by_category=[
            ExpenseCategoryTotal(category=category, total_cents=sum(amounts), count=len(amounts))
            for category, amounts in sorted(by_category.items(), key=lambda pair: -sum(pair[1]))
        ],
        savings_cents=savings,
        debt_cents=debt,
    )
    return ExpenseList(items=items, summary=summary)


@router.post("/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="记录不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(expense)
    db.commit()
