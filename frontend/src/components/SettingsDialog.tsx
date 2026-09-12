import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api, type AppSettings } from "../api";
import { Loading } from "./Widgets";

export function SettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState<AppSettings>({ weather_api_url: "", weather_api_key: "", weather_city: "", search_api_url: "", search_api_key: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void api.settings().then(setValues).catch(() => setMessage("读取设置失败")).finally(() => setLoading(false)); }, []);
  const update = (field: keyof AppSettings, value: string) => setValues(current => ({ ...current, [field]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setMessage(""); try { await api.updateSettings(values); await onSaved(); setMessage("设置已保存，天气已刷新"); } catch (err) { setMessage(err instanceof Error ? err.message : "保存失败，请检查后端服务"); } finally { setSaving(false); } };
  const importBackup = async (file: File) => {
    setMessage("");
    let payload: unknown;
    try { payload = JSON.parse(await file.text()); } catch { setMessage("备份文件不是有效的 JSON"); return; }
    if (!window.confirm("导入将覆盖当前所有待办、计划、专注记录与设置，确定继续吗？")) return;
    setImporting(true);
    try {
      await api.importData(payload);
      setMessage("数据已导入，页面即将刷新…");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err) { setMessage(err instanceof Error ? err.message : "导入失败"); } finally { setImporting(false); }
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="settings-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => void save(event)}><div className="dialog-title"><div><span>设置</span><small>配置第三方数据服务</small></div><button type="button" onClick={onClose}><X /></button></div>{loading ? <Loading /> : <><section className="settings-section"><div><h3>天气 API</h3><p>用于首页天气卡与天气详情。</p></div><label>天气城市（可选）<input value={values.weather_city} onChange={event => update("weather_city", event.target.value)} placeholder="留空则使用系统定位；可填写杭州、北京或 101210101" /></label><label>接口地址<input value={values.weather_api_url} onChange={event => update("weather_api_url", event.target.value)} placeholder="https://devapi.qweather.com/v7" /></label><label>API Key<input type="password" value={values.weather_api_key} onChange={event => update("weather_api_key", event.target.value)} placeholder="留空则保留已保存的 API Key" /></label></section><section className="settings-section"><div><h3>实时热搜聚合</h3><p>已接入 UpHotspot，由后端携带请求头获取并缓存。</p></div><label>接口地址<input value={values.search_api_url} onChange={event => update("search_api_url", event.target.value)} placeholder="https://uphotspot.com/api/all" /></label><label>API Key（可选）<input type="password" value={values.search_api_key} onChange={event => update("search_api_key", event.target.value)} placeholder="留空则保留已保存的 API Key" /></label></section><section className="settings-section"><div><h3>数据备份</h3><p>导出全部待办、计划、专注记录与设置；导入会覆盖当前数据。后端每次启动也会自动备份数据库。</p></div><div className="settings-data-actions"><a className="data-button" href="/api/export" download="yuanzhi-backup.json">导出数据</a><button type="button" disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? "导入中…" : "导入数据"}</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importBackup(file); }} /></div></section>{message && <p className="settings-message">{message}</p>}<div className="dialog-actions"><button type="button" onClick={onClose}>关闭</button><button className="primary" disabled={saving}>{saving ? "保存中…" : "保存设置"}</button></div></>}</form></div>;
}
