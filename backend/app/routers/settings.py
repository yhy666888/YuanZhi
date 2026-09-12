from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AppSetting
from ..schemas import SettingsRead, SettingsUpdate
from .trending import HOTNEWS_URL
from .weather import normalize_weather_api_url

router = APIRouter(prefix="/api", tags=["settings"])

SETTING_KEYS = ("weather_api_url", "weather_api_key", "weather_city", "search_api_url", "search_api_key")


@router.get("/settings", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    values = {setting.key: setting.value for setting in db.scalars(select(AppSetting)).all()}
    values["search_api_url"] = values.get("search_api_url", "") or HOTNEWS_URL
    values["weather_api_key"] = ""
    values["search_api_key"] = ""
    return SettingsRead(**{key: values.get(key, "") for key in SETTING_KEYS})


@router.put("/settings", response_model=SettingsRead)
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
