import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api request", () => {
  test("GET 请求拼接 /api 前缀并解析 JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, title: "任务" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const rows = await api.todos();
    expect(rows).toEqual([{ id: 1, title: "任务" }]);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/todos");
  });

  test("查询参数会被编码", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.plans("daily");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/plans?plan_type=daily");
  });

  test("失败时抛出后端 detail 信息", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "结束日期不能早于开始日期" }), { status: 422 })));
    await expect(api.deletePlan(1)).rejects.toThrow("结束日期不能早于开始日期");
  });

  test("204 空响应返回 undefined", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api.deleteTodo(1)).resolves.toBeUndefined();
  });
});
