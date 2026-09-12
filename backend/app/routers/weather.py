from gzip import decompress
from json import loads
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting

router = APIRouter(prefix="/api", tags=["weather"])


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


@router.get("/weather")
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
