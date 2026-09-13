from datetime import datetime, timedelta
from json import loads
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting

router = APIRouter(prefix="/api", tags=["trending"])

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


@router.get("/trending")
def trending(platform: str = "all", refresh: bool = False, db: Session = Depends(get_db)):
    global _trending_cache
    if platform != "all" and platform not in HOTNEWS_PLATFORMS:
        raise HTTPException(status_code=422, detail="不支持的热搜平台")
    settings = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    now = datetime.now()
    fetch_failed = False
    if refresh or not _trending_cache or now - _trending_cache[0] > timedelta(minutes=5):
        try:
            items = fetch_hotnews(settings.get("search_api_url", "").strip() or HOTNEWS_URL, settings.get("search_api_key", "").strip())
            _trending_cache = (now, items)
        except (HTTPError, URLError, TimeoutError, UnicodeError, ValueError):
            items = _trending_cache[1] if _trending_cache else []
            fetch_failed = True
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
    status_value = "ok" if result else ("upstream_error" if fetch_failed else "empty")
    return {"platform": platform, "items": result, "updated_at": updated_at.isoformat(), "status": status_value}
