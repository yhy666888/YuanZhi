import { useRef, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings";
import { syncWithWebdav } from "@/services/sync";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  async function handleSync() {
    setSyncing(true);
    setSyncResult("");
    try {
      const r = await syncWithWebdav(settings);
      setSyncResult(
        `同步完成：合并 ${r.merged} 条，${r.pulled ? "已拉取远端" : "远端为空"}，已推送本地`
      );
    } catch (e) {
      setSyncResult(`同步失败：${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }
  const fileRef = useRef<HTMLInputElement>(null);

  function exportSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yuanzhi-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text()) as Partial<AppSettings>;
      setSettings(obj);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-4">
        <h1 className="text-xl font-semibold">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-2xl divide-y px-6 pb-6">

        <section className="space-y-4 py-5">
          <h2 className="text-sm font-semibold text-muted-foreground">天气</h2>
          <div className="space-y-4">
          <SecretField
            label="和风天气 Key"
            value={settings.qweather_key}
            onChange={(v) => setSettings({ qweather_key: v })}
            placeholder="开发版 key"
          />
            <Field
              label="和风 API Host"
              value={settings.qweather_host}
              onChange={(v) => setSettings({ qweather_host: v })}
              placeholder="devapi.qweather.com"
            />
          </div>
        </section>

        <section className="space-y-4 py-5">
          <h2 className="text-sm font-semibold text-muted-foreground">WebDAV 同步（坚果云）</h2>
          <div className="space-y-4">
            <Field
              label="服务器地址"
              value={settings.webdav_url}
              onChange={(v) => setSettings({ webdav_url: v })}
              placeholder="https://dav.jianguoyun.com/dav/"
            />
          <SecretField
            label="账号"
            value={settings.webdav_username}
            onChange={(v) => setSettings({ webdav_username: v })}
            placeholder="坚果云登录账号"
          />
          <SecretField
            label="应用密码"
            value={settings.webdav_password}
            onChange={(v) => setSettings({ webdav_password: v })}
            placeholder="坚果云→安全选项→添加应用密码"
          />
            <Field
              label="远端目录"
              value={settings.webdav_path}
              onChange={(v) => setSettings({ webdav_path: v })}
              placeholder="/yuanzhi/"
            />
            <div className="flex items-center gap-3 pt-1">
              <Button variant="default" onClick={handleSync} disabled={syncing}>
                <RefreshCw className="h-4 w-4" />
                {syncing ? "同步中…" : "立即同步"}
              </Button>
              {syncResult && (
                <span className="text-sm text-muted-foreground">{syncResult}</span>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 py-5">
          <h2 className="text-sm font-semibold text-muted-foreground">番茄钟</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="专注时长（分钟）"
              type="number"
              value={settings.pomodoro_focus_min}
              onChange={(v) => setSettings({ pomodoro_focus_min: Number(v) || 0 })}
            />
            <Field
              label="休息时长（分钟）"
              type="number"
              value={settings.pomodoro_break_min}
              onChange={(v) => setSettings({ pomodoro_break_min: Number(v) || 0 })}
            />
          </div>
        </section>

        <section className="space-y-4 py-5">
          <h2 className="text-sm font-semibold text-muted-foreground">设置备份</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="h-4 w-4" />
              导出设置
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              导入设置
            </Button>
            <Button variant="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}>
              恢复默认
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
        </section>

        </div>
      </div>
    </div>
  );
}
