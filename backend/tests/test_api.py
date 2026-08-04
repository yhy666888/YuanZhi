import os
from pathlib import Path

TEST_DATABASE = Path(__file__).with_name("test.db")
os.environ["YUANZHI_DATABASE_URL"] = f"sqlite:///{TEST_DATABASE.as_posix()}"

from fastapi.testclient import TestClient

from app.database import engine
from app import main as main_module
from app.main import app


def setup_module():
    TEST_DATABASE.unlink(missing_ok=True)


def teardown_module():
    engine.dispose()
    TEST_DATABASE.unlink(missing_ok=True)


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


def test_trending_aggregates_supported_sources(monkeypatch):
    rows = [
        {"id": str(rank), "title": f"{source}-{rank}", "url": f"https://example.com/{source}/{rank}", "source": source, "rank": rank, "heat": str(100 - rank)}
        for rank in (1, 2) for source in main_module.HOTNEWS_PLATFORMS
    ]
    monkeypatch.setattr(main_module, "fetch_hotnews", lambda _url, _key: rows)
    main_module._trending_cache = None
    with TestClient(app) as client:
        combined = client.get("/api/trending?platform=all")
        assert combined.status_code == 200
        assert len(combined.json()["items"]) == len(main_module.HOTNEWS_PLATFORMS) * 2
        weibo = client.get("/api/trending?platform=weibo")
        assert [item["title"] for item in weibo.json()["items"]] == ["weibo-1", "weibo-2"]
