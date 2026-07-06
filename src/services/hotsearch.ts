import { httpGetJson } from "./http";
import type { HotSearchItem } from "@/lib/types";

const API_URL = "https://api.vvhan.com/api/hotlist/wbHot";

interface VvhanResp {
  success?: boolean;
  name?: string;
  data?: Array<{
    title: string;
    url: string;
    hot?: string;
    mobil_url?: string;
  }>;
}

export async function fetchHotSearch(): Promise<HotSearchItem[]> {
  try {
    const data = await httpGetJson<VvhanResp>(API_URL);
    const items = data.data ?? [];
    return items.slice(0, 10).map((it) => ({
      title: it.title,
      url: it.url,
      hot: it.hot ?? null,
      source: "微博",
    }));
  } catch {
    return [];
  }
}
