import os
import shutil
from datetime import date, datetime, timedelta
from pathlib import Path

TEST_DATABASE = Path(__file__).with_name("test.db")
os.environ["YUANZHI_DATABASE_URL"] = f"sqlite:///{TEST_DATABASE.as_posix()}"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.database import engine
from app.main import app
from app.migrations import run_migrations
from app.routers import trending as trending_module


def setup_module():
    TEST_DATABASE.unlink(missing_ok=True)


def teardown_module():
    engine.dispose()
    TEST_DATABASE.unlink(missing_ok=True)
    shutil.rmtree(TEST_DATABASE.parent / "backups", ignore_errors=True)


def test_plan_validation_edit_and_daily_completion():
    with TestClient(app) as client:
        invalid = client.post("/api/plans", json={
            "plan_type": "daily", "title": "无时间计划", "start_date": "2026-07-25",
            "end_date": "2026-07-25", "priority": "medium", "notes": "", "progress": 0,
        })
        assert invalid.status_code == 422

        created = client.post("/api/plans", json={
            "plan_type": "daily", "title": "原计划", "start_date": "2026-07-25",
            "end_date": "2026-07-25", "start_time": "09:00", "end_time": "10:00",
            "priority": "medium", "notes": "", "progress": 0,
        })
        assert created.status_code == 201
        plan_id = created.json()["id"]
        updated = client.patch(f"/api/plans/{plan_id}", json={"title": "新计划", "progress": 100})
        assert updated.status_code == 200
        assert updated.json()["title"] == "新计划"
        assert updated.json()["progress"] == 100


def test_180_minute_pomodoro_is_accepted():
    with TestClient(app) as client:
        response = client.post("/api/pomodoros", json={"todo_id": None, "duration_seconds": 10800})
        assert response.status_code == 200


def test_weather_without_configuration_is_empty():
    with TestClient(app) as client:
        response = client.get("/api/weather")
        assert response.status_code == 200
        assert response.json()["temperature"] is None
        assert response.json()["city"] == "--"


def test_settings_do_not_return_secret_keys():
    with TestClient(app) as client:
        saved = client.put("/api/settings", json={
            "weather_api_url": "test.re.qweatherapi.com",
            "weather_api_key": "weather-secret", "weather_city": "北京",
            "search_api_url": "", "search_api_key": "search-secret",
        })
        assert saved.status_code == 200
        assert saved.json()["weather_api_url"] == "test.re.qweatherapi.com"
        assert saved.json()["weather_api_key"] == ""
        settings = client.get("/api/settings").json()
        assert settings["weather_api_key"] == ""
        assert settings["search_api_key"] == ""


def test_daily_plan_can_repeat_on_selected_weekdays():
    with TestClient(app) as client:
        response = client.post("/api/plans", json={
            "plan_type": "daily", "title": "工作日计划", "start_date": "2026-07-27",
            "end_date": "2026-08-02", "start_time": "08:30", "end_time": "09:00",
            "priority": "medium", "notes": "", "progress": 0, "repeat_type": "weekly",
            "repeat_weekdays": [0, 2, 4],
        })
        assert response.status_code == 201
        plans = [plan for plan in client.get("/api/plans?plan_type=daily").json() if plan["title"] == "工作日计划"]
        assert [plan["start_date"] for plan in plans] == ["2026-07-27", "2026-07-29", "2026-07-31"]
        assert all(plan["start_date"] == plan["end_date"] for plan in plans)


def test_todo_created_at_is_migrated_from_utc_to_local_time(tmp_path):
    legacy_engine = create_engine(f"sqlite:///{(tmp_path / 'legacy.db').as_posix()}")
    with legacy_engine.begin() as connection:
        connection.execute(text("CREATE TABLE todos (id INTEGER PRIMARY KEY, created_at DATETIME)"))
        connection.execute(text("INSERT INTO todos (created_at) VALUES ('2026-01-01 00:00:00')"))
    run_migrations(legacy_engine)
    with legacy_engine.begin() as connection:
        value = connection.execute(text("SELECT created_at FROM todos")).scalar_one()
    legacy_engine.dispose()
    offset = int((datetime.now() - datetime.utcnow()).total_seconds())
    expected = (datetime(2026, 1, 1) + timedelta(seconds=offset)).strftime("%Y-%m-%d %H:%M:%S")
    assert value == expected


def test_trending_aggregates_supported_sources(monkeypatch):
    rows = [
        {"id": str(rank), "title": f"{source}-{rank}", "url": f"https://example.com/{source}/{rank}", "source": source, "rank": rank, "heat": str(100 - rank)}
        for rank in (1, 2) for source in trending_module.HOTNEWS_PLATFORMS
    ]
    monkeypatch.setattr(trending_module, "fetch_hotnews", lambda _url, _key: rows)
    trending_module._trending_cache = None
    with TestClient(app) as client:
        combined = client.get("/api/trending?platform=all")
        assert combined.status_code == 200
        assert len(combined.json()["items"]) == len(trending_module.HOTNEWS_PLATFORMS) * 2
        weibo = client.get("/api/trending?platform=weibo")
        assert [item["title"] for item in weibo.json()["items"]] == ["weibo-1", "weibo-2"]


def test_plan_stats_tracks_today_week_streak_and_overdue():
    with TestClient(app) as client:
        today = date.today()
        yesterday = today - timedelta(days=1)
        three_days_ago = today - timedelta(days=3)
        repeated = client.post("/api/plans", json={
            "plan_type": "daily", "title": "晨读", "start_date": yesterday.isoformat(),
            "end_date": today.isoformat(), "start_time": "07:00", "end_time": "07:30",
            "priority": "high", "notes": "", "progress": 0, "repeat_type": "daily",
        })
        assert repeated.status_code == 201
        rows = {plan["start_date"]: plan for plan in client.get("/api/plans?plan_type=daily").json() if plan["title"] == "晨读"}
        assert set(rows) == {yesterday.isoformat(), today.isoformat()}
        assert client.patch(f"/api/plans/{rows[yesterday.isoformat()]['id']}", json={"progress": 100}).status_code == 200

        extra = client.post("/api/plans", json={
            "plan_type": "daily", "title": "今日加练", "start_date": today.isoformat(),
            "end_date": today.isoformat(), "start_time": "21:00",
            "priority": "medium", "notes": "", "progress": 100,
        })
        assert extra.status_code == 201
        stale = client.post("/api/plans", json={
            "plan_type": "daily", "title": "三天前的欠账", "start_date": three_days_ago.isoformat(),
            "end_date": three_days_ago.isoformat(), "start_time": "20:00",
            "priority": "low", "notes": "", "progress": 0,
        })
        assert stale.status_code == 201

        stats = client.get("/api/plans/stats").json()
        assert stats["today_total"] == 2
        assert stats["today_completed"] == 1
        # 今天未全勤不打断纪录：连续天数统计到昨天为止，更早的欠账负责截断
        assert stats["streak_days"] == 1
        mine = {three_days_ago.isoformat(): (1, 0), yesterday.isoformat(): (1, 1), today.isoformat(): (2, 1)}
        week_start = today - timedelta(days=today.weekday())
        week_total = week_completed = 0
        for offset in range((today - week_start).days + 1):
            total, completed = mine.get((week_start + timedelta(days=offset)).isoformat(), (0, 0))
            week_total += total
            week_completed += completed
        assert stats["week_total"] == week_total
        assert stats["week_completed"] == week_completed
        assert stats["week_rate"] == round(week_completed / week_total * 100)
        assert stats["last7_total"] == 4 and stats["last7_completed"] == 2
        assert stats["last30_total"] == 4 and stats["last30_completed"] == 2
        assert stats["heatmap"][-1]["date"] == today.isoformat()
        assert len(stats["heatmap"]) == 105
        overdue_titles = [item["title"] for item in stats["overdue"]]
        assert "三天前的欠账" in overdue_titles
        assert "晨读" not in overdue_titles
        assert "今日加练" not in overdue_titles


def test_repeating_plan_series_edit_and_delete():
    with TestClient(app) as client:
        today = date.today()
        created = client.post("/api/plans", json={
            "plan_type": "daily", "title": "系列计划", "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=6)).isoformat(), "start_time": "08:00",
            "end_time": "08:30", "priority": "medium", "notes": "", "progress": 0,
            "repeat_type": "daily",
        })
        assert created.status_code == 201
        group_id = created.json()["repeat_group_id"]
        assert group_id
        single = client.post("/api/plans", json={
            "plan_type": "monthly", "title": "单独目标", "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=20)).isoformat(),
            "priority": "low", "notes": "", "progress": 0,
        }).json()
        assert single["repeat_group_id"] != group_id

        def series():
            return [plan for plan in client.get("/api/plans?plan_type=daily").json() if plan["repeat_group_id"] == group_id]

        assert len(series()) == 7
        rows = sorted(series(), key=lambda plan: plan["start_date"])
        # 默认只改选中那天
        assert client.patch(f"/api/plans/{rows[0]['id']}", json={"title": "仅改这天"}).status_code == 200
        assert {plan["title"] for plan in series()} == {"仅改这天", "系列计划"}
        # 系列修改应用内容字段，但不改各天完成状态
        assert client.patch(f"/api/plans/{rows[0]['id']}", json={"progress": 100}).status_code == 200
        assert client.patch(f"/api/plans/{rows[0]['id']}?scope=series", json={"title": "改名", "notes": "全系列备注"}).status_code == 200
        assert all(plan["title"] == "改名" and plan["notes"] == "全系列备注" for plan in series())
        assert {plan["progress"] for plan in series()} == {100, 0}
        # 删除范围：默认一天、跟随到以后、整个系列
        assert client.delete(f"/api/plans/{rows[2]['id']}").status_code == 204
        assert len(series()) == 6
        assert client.delete(f"/api/plans/{rows[3]['id']}?scope=following").status_code == 204
        assert len(series()) == 2
        assert client.delete(f"/api/plans/{rows[0]['id']}?scope=series").status_code == 204
        assert series() == []


def test_plan_repeat_groups_backfilled_from_matching_rows(tmp_path):
    legacy_engine = create_engine(f"sqlite:///{(tmp_path / 'legacy-plans.db').as_posix()}")
    with legacy_engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE plans (id INTEGER PRIMARY KEY, plan_type VARCHAR(12), title VARCHAR(160),"
            " start_time VARCHAR(5), end_time VARCHAR(5), priority VARCHAR(10))"
        ))
        connection.execute(text(
            "INSERT INTO plans (id, plan_type, title, start_time, end_time, priority) VALUES"
            " (1, 'daily', '跑步', '06:30', NULL, 'high'),"
            " (2, 'daily', '跑步', '06:30', NULL, 'high'),"
            " (3, 'daily', '冥想', '07:00', NULL, 'low')"
        ))
    run_migrations(legacy_engine)
    with legacy_engine.begin() as connection:
        rows = connection.execute(text("SELECT id, repeat_group_id FROM plans ORDER BY id")).fetchall()
    legacy_engine.dispose()
    groups = {row[0]: row[1] for row in rows}
    assert groups[1] == groups[2] and groups[1] != groups[3]


def test_export_and_import_roundtrip():
    with TestClient(app) as client:
        client.post("/api/todos", json={"title": "导出前待办", "priority": "high"})
        client.post("/api/plans", json={
            "plan_type": "monthly", "title": "导出前计划", "start_date": "2026-09-01",
            "end_date": "2026-09-30", "priority": "low", "notes": "", "progress": 10,
        })
        export = client.get("/api/export")
        assert export.status_code == 200
        assert "attachment" in export.headers["content-disposition"]
        blob = export.json()
        assert blob["app"] == "yuanzhi"
        assert "导出前待办" in [todo["title"] for todo in blob["todos"]]
        assert "导出前计划" in [plan["title"] for plan in blob["plans"]]
        assert set(blob["settings"]) == {"weather_api_url", "weather_api_key", "weather_city", "search_api_url", "search_api_key"}

        today = date.today()
        replacement = {
            "todos": [{
                "id": 99, "title": "导入的待办", "priority": "high",
                "due_at": f"{today.isoformat()}T10:00:00", "completed": True,
                "pomodoros": 2, "pomodoro_target": 3, "created_at": "2026-09-01T08:00:00",
            }],
            "plans": [{
                "id": 98, "plan_type": "daily", "title": "导入的计划",
                "start_date": today.isoformat(), "end_date": today.isoformat(),
                "start_time": "08:00", "end_time": None, "priority": "high",
                "notes": "", "progress": 0, "repeat_group_id": "abc",
            }],
            "pomodoros": [{
                "id": 97, "todo_id": 99, "duration_seconds": 1500,
                "completed_at": f"{today.isoformat()}T09:00:00",
            }],
            "settings": {"weather_city": "上海"},
        }
        imported = client.post("/api/import", json=replacement)
        assert imported.status_code == 200
        assert imported.json() == {"todos": 1, "plans": 1, "pomodoros": 1, "expenses": 0, "plan_templates": 0}

        todos = client.get("/api/todos").json()
        assert [todo["title"] for todo in todos] == ["导入的待办"]
        assert todos[0]["completed"] is True
        plans = client.get("/api/plans").json()
        assert [plan["title"] for plan in plans] == ["导入的计划"]
        assert plans[0]["repeat_group_id"] == "abc"
        dashboard = client.get("/api/dashboard").json()
        assert dashboard["total_todos"] == 1 and dashboard["completed_todos"] == 1
        assert dashboard["pomodoros_today"] == 1
        assert client.get("/api/settings").json()["weather_city"] == "上海"


def test_expense_crud_and_summary():
    with TestClient(app) as client:
        today = date.today().isoformat()
        client.post("/api/expenses", json={"amount_cents": 2500, "category": "餐饮", "note": "午饭", "spent_at": today})
        client.post("/api/expenses", json={"amount_cents": 1000, "category": "交通", "note": "地铁", "spent_at": today})
        client.post("/api/expenses", json={"amount_cents": 9900, "category": "购物", "note": "衣服", "spent_at": "2026-08-01"})
        client.post("/api/expenses", json={"amount_cents": 0, "category": "餐饮", "spent_at": today}, )
        assert client.post("/api/expenses", json={"amount_cents": 0, "category": "餐饮", "spent_at": today}).status_code == 422

        data = client.get("/api/expenses?month=2026-09").json()
        assert len(data["items"]) == 2
        assert data["summary"]["month_total_cents"] == 3500
        assert data["summary"]["today_total_cents"] == 3500
        categories = {item["category"]: item["total_cents"] for item in data["summary"]["by_category"]}
        assert categories["餐饮"] == 2500 and categories["交通"] == 1000
        assert data["summary"]["by_category"][0]["category"] == "餐饮"

        august = client.get("/api/expenses?month=2026-08").json()
        assert august["summary"]["month_total_cents"] == 9900
        assert august["summary"]["today_total_cents"] == 3500

        expense_id = data["items"][0]["id"]
        assert client.delete(f"/api/expenses/{expense_id}").status_code == 204
        assert client.get("/api/expenses?month=2026-09").json()["summary"]["count"] == 1

        export = client.get("/api/export").json()
        assert "expenses" in export and "plan_templates" in export


def test_plan_template_save_apply_and_delete():
    with TestClient(app) as client:
        source_day, target_day = "2026-09-01", "2026-09-02"
        for title, start in (("晨间阅读", "07:30"), ("编写周报", "14:00")):
            created = client.post("/api/plans", json={
                "plan_type": "daily", "title": title, "start_date": source_day,
                "end_date": source_day, "start_time": start, "end_time": None,
                "priority": "medium", "notes": "", "progress": 0,
            })
            assert created.status_code == 201

        empty = client.post("/api/plan-templates", json={"name": "空模板", "date": "2026-09-03"})
        assert empty.status_code == 422

        saved = client.post("/api/plan-templates", json={"name": "工作日模板", "date": source_day})
        assert saved.status_code == 201
        template = saved.json()
        assert template["name"] == "工作日模板"
        assert [item["title"] for item in template["items"]] == ["晨间阅读", "编写周报"]
        template_id = template["id"]

        applied = client.post(f"/api/plan-templates/{template_id}/apply", json={"date": target_day})
        assert applied.status_code == 200
        assert applied.json() == {"created": 2, "date": target_day, "total": 2}
        again = client.post(f"/api/plan-templates/{template_id}/apply", json={"date": target_day})
        assert again.json()["created"] == 0
        titles = [plan["title"] for plan in client.get("/api/plans?plan_type=daily").json() if plan["start_date"] == target_day]
        assert titles == ["晨间阅读", "编写周报"]

        missing = client.post("/api/plan-templates/999/apply", json={"date": target_day})
        assert missing.status_code == 404

        templates = client.get("/api/plan-templates").json()
        assert len(templates) == 1 and templates[0]["id"] == template_id
        assert client.delete(f"/api/plan-templates/{template_id}").status_code == 204
        assert client.get("/api/plan-templates").json() == []


def test_plan_checkins_month_window_and_future_guard():
    with TestClient(app) as client:
        client.post("/api/plans", json={
            "plan_type": "daily", "title": "月内计划", "start_date": "2026-09-05",
            "end_date": "2026-09-05", "start_time": "09:00", "priority": "medium",
            "notes": "", "progress": 0,
        })
        data = client.get("/api/plans/checkins?month=2026-09").json()
        assert data["period"] == "2026-09"
        assert len(data["days"]) == 30
        target = next(day for day in data["days"] if day["date"] == "2026-09-05")
        assert target == {"date": "2026-09-05", "total": 1, "completed": 0}
        assert client.get("/api/plans/checkins?month=2026-13").status_code == 422
        assert client.get("/api/plans/checkins?month=2099-01").status_code == 422
        current = client.get("/api/plans/checkins").json()
        assert current["period"] == date.today().strftime("%Y-%m")
        year_data = client.get("/api/plans/checkins?year=2026").json()
        assert year_data["period"] == "2026"
        assert len(year_data["days"]) == 365
        assert client.get("/api/plans/checkins?year=2099").status_code == 422


def test_pomodoro_records_list_update_and_delete():
    from app.database import SessionLocal
    from app.models import PomodoroSession as PomodoroModel

    with SessionLocal() as db:
        db.query(PomodoroModel).delete()
        db.commit()
    with TestClient(app) as client:
        assert client.post("/api/pomodoros", json={"todo_id": None, "duration_seconds": 1500}).status_code == 200
        listed = client.get("/api/pomodoros?days=7").json()
        assert len(listed) == 1
        session_id = listed[0]["id"]
        updated = client.patch(f"/api/pomodoros/{session_id}", json={"duration_seconds": 600, "completed_at": "2026-09-13T10:00:00"})
        assert updated.status_code == 200
        assert updated.json()["duration_seconds"] == 600
        assert client.patch("/api/pomodoros/999999", json={"duration_seconds": 600}).status_code == 404
        assert client.delete(f"/api/pomodoros/{session_id}").status_code == 204
        assert client.get("/api/pomodoros?days=7").json() == []


def test_api_token_guard(monkeypatch):
    from app import main as main_module

    monkeypatch.setattr(main_module, "API_TOKEN", "secret")
    with TestClient(app) as client:
        assert client.get("/api/todos").status_code == 401
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/todos", headers={"X-YuanZhi-Token": "secret"}).status_code == 200
        assert client.get("/api/todos", headers={"X-YuanZhi-Token": "wrong"}).status_code == 401


def test_expense_income_edit_savings_and_debt():
    from app.database import Base, SessionLocal, engine
    from app.models import Expense as ExpenseModel

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.query(ExpenseModel).delete()
        db.commit()
    with TestClient(app) as client:
        today = date.today().isoformat()
        month = today[:7]
        client.post("/api/expenses", json={"kind": "income", "amount_cents": 1000000, "category": "工资", "method": "银行卡", "note": "月薪", "spent_at": today})
        client.post("/api/expenses", json={"amount_cents": 3000, "category": "购物", "method": "信用卡", "note": "衣服", "spent_at": today})
        client.post("/api/expenses", json={"amount_cents": 2500, "category": "餐饮", "method": "微信", "note": "午饭", "spent_at": today})

        data = client.get(f"/api/expenses?month={month}").json()
        summary = data["summary"]
        # 信用卡消费计入本月支出，同时累计为负债
        assert summary["month_total_cents"] == 5500
        assert summary["month_income_cents"] == 1000000
        assert summary["savings_cents"] == 1000000 - 2500
        assert summary["debt_cents"] == 3000
        assert summary["today_total_cents"] == 5500

        target = next(item for item in data["items"] if item["note"] == "午饭")
        edited = client.patch(f"/api/expenses/{target['id']}", json={"amount_cents": 2000, "method": "支付宝"})
        assert edited.status_code == 200
        assert edited.json()["method"] == "支付宝"
        data2 = client.get(f"/api/expenses?month={month}").json()
        assert data2["summary"]["month_total_cents"] == 5000
        assert data2["summary"]["savings_cents"] == 1000000 - 2000

        client.post("/api/expenses", json={"kind": "income", "amount_cents": 1500, "category": "其他", "method": "信用卡", "note": "还卡", "spent_at": today})
        final = client.get(f"/api/expenses?month={month}").json()
        assert final["summary"]["debt_cents"] == 1500


def test_expense_spent_at_keeps_hour_and_minute():
    from app.database import SessionLocal
    from app.models import Expense as ExpenseModel

    with SessionLocal() as db:
        db.query(ExpenseModel).delete()
        db.commit()
    with TestClient(app) as client:
        today = date.today().isoformat()
        created = client.post("/api/expenses", json={
            "kind": "expense", "amount_cents": 1800, "category": "餐饮",
            "method": "微信", "note": "晚餐", "spent_at": f"{today}T19:30",
        })
        assert created.status_code == 201
        assert created.json()["spent_at"].startswith(f"{today}T19:30")
        listed = client.get(f"/api/expenses?month={today[:7]}").json()
        assert listed["items"][0]["spent_at"].startswith(f"{today}T19:30")
        # 历史仅含日期的记录（导入场景）也能被解析
        legacy = client.post("/api/expenses", json={
            "kind": "expense", "amount_cents": 500, "category": "交通",
            "method": "现金", "note": "", "spent_at": "2026-08-01",
        })
        assert legacy.status_code == 201
