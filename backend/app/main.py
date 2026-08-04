from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta
from gzip import decompress
from json import loads
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .migrations import run_migrations
from .models import AppSetting, Plan, PomodoroSession, Todo
from .schemas import DashboardRead, PlanCreate, PlanRead, PlanUpdate, PomodoroComplete, SettingsRead, SettingsUpdate, TodoCreate, TodoRead, TodoUpdate

def create_tables():
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    with Session(bind=engine) as db:
        if (db.scalar(select(func.count()).select_from(Todo)) or 0) == 0:
            today = datetime.now().replace(second=0, microsecond=0)
            db.add_all([
                Todo(title="完成产品需求文档", priority="high", due_at=today.replace(hour=18, minute=0), pomodoros=4, pomodoro_target=8),
                Todo(title="准备周会演示 PPT", priority="high", due_at=today.replace(hour=14, minute=0), pomodoro_target=3),
                Todo(title="审阅设计稿并给出反馈", priority="medium", due_at=today.replace(hour=17, minute=0), pomodoro_target=2),
                Todo(title="整理用户反馈数据", priority="medium", due_at=today.replace(hour=23, minute=59), pomodoro_target=4),
                Todo(title="更新项目文档", priority="low", due_at=today + timedelta(days=1), pomodoro_target=2),
            ])
            db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="YuanZhi API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/todos", response_model=list[TodoRead])
def list_todos(db: Session = Depends(get_db)):
    return db.scalars(select(Todo).order_by(Todo.completed, Todo.due_at.is_(None), Todo.due_at, Todo.id.desc())).all()


@app.post("/api/todos", response_model=TodoRead, status_code=status.HTTP_201_CREATED)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    todo = Todo(**payload.model_dump())
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@app.patch("/api/todos/{todo_id}", response_model=TodoRead)
def update_todo(todo_id: int, payload: TodoUpdate, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(todo, field, value)
    db.commit()
    db.refresh(todo)
    return todo


@app.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.get(Todo, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()


@app.post("/api/pomodoros", response_model=TodoRead | None)
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


@app.get("/api/dashboard", response_model=DashboardRead)
def dashboard(db: Session = Depends(get_db)):
    start = datetime.combine(date.today(), time.min)
    end = start + timedelta(days=1)
    today_todos = (Todo.due_at >= start, Todo.due_at < end)
    today_sessions = (PomodoroSession.completed_at >= start, PomodoroSession.completed_at < end)
    total = db.scalar(select(func.count()).select_from(Todo).where(*today_todos)) or 0
    completed = db.scalar(select(func.count()).select_from(Todo).where(Todo.completed.is_(True), *today_todos)) or 0
    focus = db.scalar(select(func.coalesce(func.sum(PomodoroSession.duration_seconds), 0)).where(*today_sessions)) or 0
    pomodoros = db.scalar(select(func.count()).select_from(PomodoroSession).where(*today_sessions)) or 0
    return DashboardRead(total_todos=total, completed_todos=completed, focus_minutes_today=focus // 60, pomodoros_today=pomodoros)


@app.get("/api/plans", response_model=list[PlanRead])
def list_plans(plan_type: str | None = None, db: Session = Depends(get_db)):
    query = select(Plan)
    if plan_type:
        query = query.where(Plan.plan_type == plan_type)
    return db.scalars(query.order_by(Plan.start_date, Plan.start_time, Plan.id.desc())).all()


@app.post("/api/plans", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
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


@app.patch("/api/plans/{plan_id}", response_model=PlanRead)
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


@app.delete("/api/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()


def qweather_json(url: str):
    with urlopen(url, timeout=8) as response:
        content = response.read()
    if content.startswith(b"\x1f\x8b"):
        content = decompress(content)
    return loads(content)


def qweather_request(base_url: str, endpoint: str, key: str, location: str):
    query = urlencode({"location": location, "key": key, "lang": "zh"})
    payload = qweather_json(f"{base_url}/weather/{endpoint}?{query}")
    if payload.get("code") != "200":
        raise HTTPException(status_code=502, detail=f"QWeather request failed: {payload.get('code', 'unknown')}")
    return payload


def qweather_city_lookup(base_url: str, key: str, city: str):
    query = urlencode({"location": city, "key": key, "lang": "zh"})
    host = base_url.removesuffix("/v7")
    return qweather_json(f"{host}/geo/v2/city/lookup?{query}")


def empty_weather():
    return {
        "city": "--", "condition": "--", "temperature": None,
        "feels_like": None, "humidity": None, "wind_speed": None,
        "wind_direction": "--", "air_quality": "--", "high": None,
        "low": None, "updated_at": "", "forecast": [],
    }


def normalize_weather_api_url(value: str):
    raw = value.strip() or "https://devapi.qweather.com/v7"
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not hostname or not hostname.endswith((".qweather.com", ".qweatherapi.com")):
        raise HTTPException(status_code=422, detail="天气 API 地址必须是 QWeather 的 HTTPS 域名")
    base_url = raw.rstrip("/")
    for endpoint in ("/weather/now", "/weather/7d"):
        if base_url.endswith(endpoint):
            base_url = base_url[: -len(endpoint)]
            break
    if not base_url.endswith("/v7"):
        base_url = f"{base_url}/v7"
    return base_url


@app.get("/api/weather")
def qweather(db: Session = Depends(get_db), location: str | None = None):
    settings = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    api_key = settings.get("weather_api_key", "").strip()
    requested_city = settings.get("weather_city", "").strip() or (location or "").strip()
    if not requested_city:
        return empty_weather()
    if not api_key:
        return empty_weather()

    base_url = normalize_weather_api_url(settings.get("weather_api_url", ""))
    try:
        lookup = qweather_city_lookup(base_url, api_key, requested_city)
        locations = lookup.get("location") or []
        if lookup.get("code") != "200" or not locations:
            return empty_weather()
        location = locations[0]
        location_id = location.get("id", requested_city)
        city_name = location.get("name", requested_city)
        now_payload = qweather_request(base_url, "now", api_key, location_id)
        daily_payload = qweather_request(base_url, "7d", api_key, location_id)
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError):
        return empty_weather()

    now = now_payload["now"]
    daily = daily_payload["daily"]
    today = daily[0]
    return {
        "city": city_name, "condition": now["text"], "temperature": int(now["temp"]),
        "feels_like": int(now["feelsLike"]), "humidity": int(now["humidity"]),
        "wind_speed": int(now["windSpeed"]), "wind_direction": now["windDir"],
        "air_quality": "--", "high": int(today["tempMax"]), "low": int(today["tempMin"]),
        "updated_at": now["obsTime"],
        "forecast": [
            {
                "date": item["fxDate"], "condition": item["textDay"], "condition_night": item["textNight"],
                "icon": item["iconDay"], "high": int(item["tempMax"]), "low": int(item["tempMin"]),
                "humidity": int(item["humidity"]), "wind_direction": item["windDirDay"],
                "wind_speed": int(item["windSpeedDay"]),
            }
            for item in daily
        ],
    }


HOTNEWS_URL = "https://uphotspot.com/api/all"
HOTNEWS_PLATFORMS = ("weibo", "douyin", "zhihu", "bilibili", "baidu", "toutiao")
_trending_cache: tuple[datetime, list[dict]] | None = None


def fetch_hotnews(url: str, api_key: str):
    parsed = urlparse(url)
    if parsed.scheme != "https" or (parsed.hostname or "").lower() != "uphotspot.com" or parsed.path != "/api/all":
        raise HTTPException(status_code=422, detail="热搜 API 地址必须是 https://uphotspot.com/api/all")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": "https://uphotspot.com/",
        "Origin": "https://uphotspot.com",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["X-API-Key"] = api_key
    with urlopen(Request(url, headers=headers), timeout=20) as response:
        payload = loads(response.read())
    data = payload.get("data")
    if not isinstance(data, list):
        raise ValueError("Invalid hotnews response")
    return data


@app.get("/api/trending")
def trending(platform: str = "all", refresh: bool = False, db: Session = Depends(get_db)):
    global _trending_cache
    if platform != "all" and platform not in HOTNEWS_PLATFORMS:
        raise HTTPException(status_code=422, detail="不支持的热搜平台")
    settings = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    now = datetime.now()
    if refresh or not _trending_cache or now - _trending_cache[0] > timedelta(minutes=5):
        try:
            items = fetch_hotnews(settings.get("search_api_url", "").strip() or HOTNEWS_URL, settings.get("search_api_key", "").strip())
            _trending_cache = (now, items)
        except (HTTPError, URLError, TimeoutError, UnicodeError, ValueError):
            items = _trending_cache[1] if _trending_cache else []
    else:
        items = _trending_cache[1]
    if platform == "all":
        selected = []
        for rank in range(1, 3):
            selected.extend(next((item for item in items if item.get("source") == source and item.get("rank") == rank), None) for source in HOTNEWS_PLATFORMS)
        selected = [item for item in selected if item is not None]
    else:
        selected = [item for item in items if item.get("source") == platform][:10]
    result = [{
        "id": f"{item.get('source', 'unknown')}-{item.get('id', index)}-{index}",
        "platform": item.get("source"), "title": str(item.get("title", "")),
        "heat": str(item.get("heat") or "--"), "url": str(item.get("url") or "#"),
    } for index, item in enumerate(selected, 1) if item.get("title")]
    updated_at = _trending_cache[0] if _trending_cache else now
    return {"platform": platform, "items": result, "updated_at": updated_at.isoformat()}


SETTING_KEYS = ("weather_api_url", "weather_api_key", "weather_city", "search_api_url", "search_api_key")


@app.get("/api/settings", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    values = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    values["search_api_url"] = values.get("search_api_url", "") or HOTNEWS_URL
    values["weather_api_key"] = ""
    values["search_api_key"] = ""
    return SettingsRead(**{key: values.get(key, "") for key in SETTING_KEYS})


@app.put("/api/settings", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    values = payload.model_dump()
    normalize_weather_api_url(values["weather_api_url"])
    if values["search_api_url"]:
        parsed_search = urlparse(values["search_api_url"])
        if parsed_search.scheme != "https" or parsed_search.hostname != "uphotspot.com" or parsed_search.path != "/api/all":
            raise HTTPException(status_code=422, detail="热搜 API 地址必须是 https://uphotspot.com/api/all")
    for key in SETTING_KEYS:
        setting = db.get(AppSetting, key)
        if key.endswith("_api_key") and not values[key] and setting:
            continue
        if setting:
            setting.value = values[key]
        else:
            db.add(AppSetting(key=key, value=values[key]))
    db.commit()
    values["weather_api_key"] = ""
    values["search_api_key"] = ""
    return SettingsRead(**values)
