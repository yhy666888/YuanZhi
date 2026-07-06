import { isTauri } from "@/lib/env";

export async function httpGetJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const k in h) headers[k] = h[k];
    }
    const text = await invoke<string>("proxy_get", { url, headers });
    return JSON.parse(text) as T;
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function httpGetText(
  url: string,
  init?: RequestInit
): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const k in h) headers[k] = h[k];
    }
    return invoke<string>("proxy_get", { url, headers });
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}
